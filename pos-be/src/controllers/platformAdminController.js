const bcrypt = require('bcryptjs');
const { basePrisma } = require('../config/prisma');
const { validatePassword } = require('../config/auth');
const { createTrialLicenseData, invalidateLicenseCache, serializeLicense } = require('../services/licenseService');
const {
  calculateExtendedExpiry,
  createActivationCode,
  createPlatformSession,
  generateActivationCode,
  publicPlatformAdmin,
} = require('../services/platformAdminService');

const PASSWORD_ROUNDS = 12;
const PAID_STATUSES = ['PAID', 'COMPLETED'];

const audit = (adminId, action, targetType, targetId, details = null, requestId = null, prisma = basePrisma) => prisma.platformAuditLog.create({
  data: {
    requestId,
    adminId,
    action,
    targetType,
    targetId: targetId === undefined || targetId === null ? null : String(targetId),
    details: details ? JSON.stringify(details) : null,
  },
});

const getIdempotencyKey = (req) => {
  const value = String(req.get('idempotency-key') || '').trim();
  return /^[A-Za-z0-9:_-]{8,100}$/.test(value) ? value : null;
};

const requireIdempotencyKey = (req, res) => {
  const requestId = getIdempotencyKey(req);
  if (!requestId) {
    res.status(400).json({ success: false, code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key yang valid wajib dikirim.' });
    return null;
  }
  return requestId;
};

const parsePositiveInt = (value, fallback, maximum = 100) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

const serializeStoreListItem = (store, now = new Date()) => {
  const license = store.licenses?.[0] || null;
  const ownerMembership = store.memberships?.find((membership) => membership.role === 'OWNER');
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    type: store.type,
    isActive: store.isActive,
    isPublicDemo: store.isPublicDemo,
    createdAt: store.createdAt,
    owner: ownerMembership?.user || null,
    memberCount: store._count?.memberships || 0,
    productCount: store._count?.products || 0,
    transactionCount: store._count?.transactions || 0,
    lastTransactionAt: store.transactions?.[0]?.createdAt || null,
    license: license ? serializeLicense(license, now) : null,
  };
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    let admin = await basePrisma.platformAdmin.findUnique({ where: { email } });
    if (!admin) {
      const adminCount = await basePrisma.platformAdmin.count();
      const bootstrapEmail = String(process.env.PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase();
      const bootstrapPassword = String(process.env.PLATFORM_ADMIN_PASSWORD || '');
      const passwordError = validatePassword(bootstrapPassword);
      if (adminCount === 0 && email === bootstrapEmail && !passwordError && password === bootstrapPassword) {
        admin = await basePrisma.platformAdmin.create({
          data: {
            name: String(process.env.PLATFORM_ADMIN_NAME || 'Super Admin').trim().slice(0, 255),
            email: bootstrapEmail,
            password: await bcrypt.hash(bootstrapPassword, PASSWORD_ROUNDS),
          },
        });
        await audit(admin.id, 'PLATFORM_ADMIN_BOOTSTRAPPED', 'PLATFORM_ADMIN', admin.id);
      }
    }

    const passwordMatches = admin?.isActive && await bcrypt.compare(password, admin.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Email atau password salah.' });
    }

    const loggedInAt = new Date();
    admin = await basePrisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: loggedInAt },
    });
    const { session, token } = await createPlatformSession({
      prisma: basePrisma,
      admin,
      userAgent: req.get('user-agent'),
    });
    await audit(admin.id, 'PLATFORM_ADMIN_LOGIN', 'PLATFORM_ADMIN', admin.id);
    return res.json({
      success: true,
      token,
      sessionExpiresAt: session.expiresAt,
      admin: publicPlatformAdmin(admin),
    });
  } catch (error) {
    console.error(`[PLATFORM LOGIN ERROR] ${error.message}`);
    return res.status(500).json({ success: false, message: 'Login Super Admin belum dapat diproses.' });
  }
};

exports.me = (req, res) => res.json({ success: true, admin: req.platformAdmin });

exports.logout = async (req, res) => {
  try {
    await basePrisma.platformAdminSession.updateMany({
      where: { id: req.platformAdminSession.id, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'LOGOUT' },
    });
    return res.json({ success: true, message: 'Logout berhasil.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Logout belum dapat diproses.' });
  }
};

exports.overview = async (req, res) => {
  try {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start30Days = new Date(startToday.getTime() - 29 * 24 * 60 * 60 * 1000);
    const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [
      totalStores,
      activeStores,
      registrationsToday,
      registrations30Days,
      trialActive,
      expiredLicenses,
      premiumActive,
      suspendedLicenses,
      activeUsers,
      transactionCount30Days,
      revenue30Days,
      registrations,
      expiring,
    ] = await Promise.all([
      basePrisma.store.count(),
      basePrisma.store.count({ where: { isActive: true } }),
      basePrisma.store.count({ where: { createdAt: { gte: startToday } } }),
      basePrisma.store.count({ where: { createdAt: { gte: start30Days } } }),
      basePrisma.storeLicense.count({ where: { plan: 'TRIAL', state: 'ACTIVE', expiresAt: { gt: now } } }),
      basePrisma.storeLicense.count({ where: { expiresAt: { lte: now } } }),
      basePrisma.storeLicense.count({ where: { plan: 'PREMIUM', state: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
      basePrisma.storeLicense.count({ where: { state: 'SUSPENDED' } }),
      basePrisma.user.count({ where: { isActive: true } }),
      basePrisma.transaction.count({ where: { createdAt: { gte: start30Days }, status: { in: PAID_STATUSES } } }),
      basePrisma.transaction.aggregate({
        where: { createdAt: { gte: start30Days }, status: { in: PAID_STATUSES } },
        _sum: { grandTotal: true },
      }),
      basePrisma.store.findMany({
        where: { createdAt: { gte: start30Days } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      basePrisma.storeLicense.findMany({
        where: { state: 'ACTIVE', expiresAt: { gt: now, lte: next14Days } },
        include: { store: { select: { id: true, name: true, slug: true } } },
        orderBy: { expiresAt: 'asc' },
        take: 10,
      }),
    ]);

    const registrationByDate = new Map();
    for (let offset = 0; offset < 30; offset += 1) {
      const day = new Date(start30Days.getTime() + offset * 24 * 60 * 60 * 1000);
      registrationByDate.set(day.toISOString().slice(0, 10), 0);
    }
    registrations.forEach(({ createdAt }) => {
      const key = createdAt.toISOString().slice(0, 10);
      registrationByDate.set(key, (registrationByDate.get(key) || 0) + 1);
    });

    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      data: {
        metrics: {
          totalStores,
          activeStores,
          registrationsToday,
          registrations30Days,
          trialActive,
          expiredLicenses,
          premiumActive,
          suspendedLicenses,
          activeUsers,
          transactionCount30Days,
          revenue30Days: Number(revenue30Days._sum.grandTotal || 0),
        },
        registrations: Array.from(registrationByDate, ([date, count]) => ({ date, count })),
        expiringLicenses: expiring.map((license) => ({
          store: license.store,
          plan: license.plan,
          expiresAt: license.expiresAt,
        })),
      },
    });
  } catch (error) {
    console.error(`[PLATFORM OVERVIEW ERROR] ${error.message}`);
    return res.status(500).json({ success: false, message: 'Analitik platform belum dapat dimuat.' });
  }
};

exports.listStores = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const search = String(req.query.q || '').trim();
    const status = String(req.query.status || 'ALL').toUpperCase();
    const now = new Date();
    const where = {
      ...(search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {}),
    };
    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'INACTIVE') where.isActive = false;
    if (status === 'TRIAL') where.licenses = { some: { plan: 'TRIAL', state: 'ACTIVE', expiresAt: { gt: now } } };
    if (status === 'PREMIUM') where.licenses = { some: { plan: 'PREMIUM', state: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } };
    if (status === 'EXPIRED') where.licenses = { some: { expiresAt: { lte: now } } };
    if (status === 'SUSPENDED') where.licenses = { some: { state: 'SUSPENDED' } };

    const [total, stores] = await Promise.all([
      basePrisma.store.count({ where }),
      basePrisma.store.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          memberships: {
            where: { isActive: true },
            select: { role: true, user: { select: { id: true, name: true, email: true, username: true } } },
          },
          licenses: { take: 1, orderBy: { updatedAt: 'desc' } },
          transactions: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } },
          _count: { select: { memberships: true, products: true, transactions: true } },
        },
      }),
    ]);
    return res.json({
      success: true,
      data: stores.map((store) => serializeStoreListItem(store, now)),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error(`[PLATFORM STORES ERROR] ${error.message}`);
    return res.status(500).json({ success: false, message: 'Daftar usaha belum dapat dimuat.' });
  }
};

exports.getStore = async (req, res) => {
  try {
    const storeId = Number(req.params.id);
    if (!Number.isInteger(storeId)) return res.status(400).json({ success: false, message: 'ID usaha tidak valid.' });
    const store = await basePrisma.store.findUnique({
      where: { id: storeId },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, isActive: true, createdAt: true, user: { select: { id: true, name: true, email: true, username: true, lastLoginAt: true } } },
        },
        licenses: { take: 1, orderBy: { updatedAt: 'desc' } },
        settings: { select: { phone: true, email: true, address: true } },
        _count: { select: { products: true, customers: true, transactions: true } },
      },
    });
    if (!store) return res.status(404).json({ success: false, message: 'Usaha tidak ditemukan.' });
    return res.json({ success: true, data: { ...store, license: store.licenses[0] ? serializeLicense(store.licenses[0]) : null, licenses: undefined } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Detail usaha belum dapat dimuat.' });
  }
};

exports.updateStoreStatus = async (req, res) => {
  try {
    const requestId = requireIdempotencyKey(req, res);
    if (!requestId) return undefined;
    const storeId = Number(req.params.id);
    const isActive = req.body?.isActive;
    if (!Number.isInteger(storeId) || typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'ID usaha atau status tidak valid.' });
    }
    const action = isActive ? 'STORE_ACTIVATED' : 'STORE_DEACTIVATED';
    const result = await basePrisma.$transaction(async (tx) => {
      const previous = await tx.platformAuditLog.findUnique({ where: { requestId } });
      if (previous) {
        if (previous.adminId !== req.platformAdmin.id || previous.action !== action || previous.targetId !== String(storeId)) {
          const conflict = new Error('Idempotency-Key sudah digunakan untuk tindakan lain.');
          conflict.code = 'IDEMPOTENCY_CONFLICT';
          throw conflict;
        }
        return { store: await tx.store.findUnique({ where: { id: storeId } }), repeated: true };
      }
      const store = await tx.store.update({ where: { id: storeId }, data: { isActive } });
      await audit(req.platformAdmin.id, action, 'STORE', storeId, { reason: String(req.body?.reason || '').slice(0, 255) || null }, requestId, tx);
      return { store, repeated: false };
    }, { isolationLevel: 'RepeatableRead' });
    return res.json({ success: true, repeated: result.repeated, message: `Usaha berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`, data: result.store });
  } catch (error) {
    if (error.code === 'IDEMPOTENCY_CONFLICT') return res.status(409).json({ success: false, code: error.code, message: error.message });
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Usaha tidak ditemukan.' });
    return res.status(500).json({ success: false, message: 'Status usaha belum dapat diubah.' });
  }
};

exports.updateLicense = async (req, res) => {
  try {
    const requestId = requireIdempotencyKey(req, res);
    if (!requestId) return undefined;
    const storeId = Number(req.params.id);
    const action = String(req.body?.action || '').toUpperCase();
    const durationDays = Number(req.body?.durationDays);
    if (!Number.isInteger(storeId) || !['EXTEND', 'SUSPEND', 'ACTIVATE'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Permintaan lisensi tidak valid.' });
    }
    if (action === 'EXTEND' && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)) {
      return res.status(400).json({ success: false, message: 'Durasi perpanjangan harus 1 sampai 3650 hari.' });
    }
    const now = new Date();
    const result = await basePrisma.$transaction(async (tx) => {
      const previous = await tx.platformAuditLog.findUnique({ where: { requestId } });
      const auditAction = `LICENSE_${action}`;
      if (previous) {
        if (previous.adminId !== req.platformAdmin.id || previous.action !== auditAction || previous.targetId !== String(storeId)) {
          const conflict = new Error('Idempotency-Key sudah digunakan untuk tindakan lain.');
          conflict.code = 'IDEMPOTENCY_CONFLICT';
          throw conflict;
        }
        return { license: await tx.storeLicense.findUnique({ where: { storeId } }), repeated: true };
      }
      const store = await tx.store.findUnique({ where: { id: storeId }, select: { id: true } });
      if (!store) {
        const error = new Error('Usaha tidak ditemukan.');
        error.code = 'STORE_NOT_FOUND';
        throw error;
      }
      let current = await tx.storeLicense.findUnique({ where: { storeId } });
      if (!current) current = await tx.storeLicense.create({ data: { storeId, ...createTrialLicenseData(now) } });
      const data = action === 'EXTEND'
        ? {
          plan: 'PREMIUM',
          state: 'ACTIVE',
          expiresAt: calculateExtendedExpiry(current.expiresAt, durationDays, now),
          activatedAt: now,
          activationSource: 'SUPER_ADMIN',
        }
        : { state: action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE' };
      const license = await tx.storeLicense.update({ where: { id: current.id }, data });
      await audit(req.platformAdmin.id, auditAction, 'STORE', storeId, {
        durationDays: action === 'EXTEND' ? durationDays : undefined,
        reason: String(req.body?.reason || '').slice(0, 255) || null,
        expiresAt: license.expiresAt,
      }, requestId, tx);
      return { license, repeated: false };
    }, { isolationLevel: 'RepeatableRead' });
    invalidateLicenseCache(storeId);
    return res.json({ success: true, repeated: result.repeated, message: 'Lisensi berhasil diperbarui.', data: serializeLicense(result.license) });
  } catch (error) {
    if (error.code === 'IDEMPOTENCY_CONFLICT') return res.status(409).json({ success: false, code: error.code, message: error.message });
    if (error.code === 'STORE_NOT_FOUND') return res.status(404).json({ success: false, message: error.message });
    console.error(`[PLATFORM LICENSE ERROR] ${error.message}`);
    return res.status(500).json({ success: false, message: 'Lisensi belum dapat diperbarui.' });
  }
};

exports.listActivationCodes = async (req, res) => {
  try {
    const codes = await basePrisma.licenseActivation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, plan: true, durationDays: true, validUntil: true, note: true, createdAt: true, redeemedAt: true, redeemedByEmail: true, licenseId: true },
    });
    return res.json({ success: true, data: codes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Daftar token belum dapat dimuat.' });
  }
};

exports.createActivationCode = async (req, res) => {
  try {
    const requestId = requireIdempotencyKey(req, res);
    if (!requestId) return undefined;
    const durationDays = Number(req.body?.durationDays);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      return res.status(400).json({ success: false, message: 'Durasi token harus 1 sampai 3650 hari.' });
    }
    let validUntil = null;
    if (req.body?.validUntil) {
      validUntil = new Date(req.body.validUntil);
      if (Number.isNaN(validUntil.getTime()) || validUntil <= new Date()) {
        return res.status(400).json({ success: false, message: 'Batas penggunaan token harus di masa depan.' });
      }
    }
    const note = String(req.body?.note || '').trim().slice(0, 255) || null;
    const result = await basePrisma.$transaction(async (tx) => {
      const previous = await tx.platformAuditLog.findUnique({ where: { requestId } });
      if (previous) {
        if (previous.adminId !== req.platformAdmin.id || previous.action !== 'ACTIVATION_CODE_CREATED') {
          const conflict = new Error('Idempotency-Key sudah digunakan untuk tindakan lain.');
          conflict.code = 'IDEMPOTENCY_CONFLICT';
          throw conflict;
        }
        const activation = await tx.licenseActivation.findUnique({ where: { id: previous.targetId } });
        return { activation, code: generateActivationCode(requestId), repeated: true };
      }
      const created = await createActivationCode({ prisma: tx, durationDays, validUntil, note, requestId });
      await audit(req.platformAdmin.id, 'ACTIVATION_CODE_CREATED', 'LICENSE_ACTIVATION', created.activation.id, { durationDays, validUntil, note }, requestId, tx);
      return { ...created, repeated: false };
    }, { isolationLevel: 'RepeatableRead' });
    const { activation, code } = result;
    return res.status(201).json({
      success: true,
      repeated: result.repeated,
      message: 'Token berhasil dibuat. Salin sekarang karena token asli tidak disimpan.',
      data: { id: activation.id, code, durationDays, validUntil, note, createdAt: activation.createdAt },
    });
  } catch (error) {
    if (error.code === 'IDEMPOTENCY_CONFLICT') return res.status(409).json({ success: false, code: error.code, message: error.message });
    console.error(`[PLATFORM CODE ERROR] ${error.message}`);
    return res.status(500).json({ success: false, message: 'Token aktivasi belum dapat dibuat.' });
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 50, 100);
    const logs = await basePrisma.platformAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
    return res.json({ success: true, data: logs.map((log) => ({ ...log, details: log.details ? JSON.parse(log.details) : null })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Riwayat tindakan belum dapat dimuat.' });
  }
};

module.exports.serializeStoreListItem = serializeStoreListItem;
