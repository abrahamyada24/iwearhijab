const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { addDays, hashActivationCode } = require('./licenseService');

const PLATFORM_ADMIN_AUDIENCE = 'kasirpos-platform-admin';
const PLATFORM_ADMIN_ISSUER = 'kasirpos-api';
const PLATFORM_SESSION_MS = 12 * 60 * 60 * 1000;
const PLATFORM_IDLE_MS = 2 * 60 * 60 * 1000;

const getPlatformJwtSecret = () => {
  const secret = process.env.PLATFORM_ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('PLATFORM_ADMIN_JWT_SECRET atau JWT_SECRET wajib tersedia.');
  return secret;
};

const publicPlatformAdmin = (admin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  lastLoginAt: admin.lastLoginAt,
});

const createPlatformSession = async ({ prisma, admin, userAgent }) => {
  const now = new Date();
  const sessionId = crypto.randomUUID();
  const jwtId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + PLATFORM_SESSION_MS);
  const session = await prisma.platformAdminSession.create({
    data: {
      id: sessionId,
      jwtId,
      adminId: admin.id,
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      expiresAt,
    },
  });
  const token = jwt.sign(
    { sid: session.id, type: 'PLATFORM_ADMIN' },
    getPlatformJwtSecret(),
    {
      algorithm: 'HS256',
      audience: PLATFORM_ADMIN_AUDIENCE,
      issuer: PLATFORM_ADMIN_ISSUER,
      jwtid: jwtId,
      subject: String(admin.id),
      expiresIn: Math.floor(PLATFORM_SESSION_MS / 1000),
    },
  );
  return { session, token };
};

const generateActivationCode = (requestId = null) => {
  // Seed dari Idempotency-Key membuat retry menghasilkan token asli yang sama,
  // tanpa menyimpan token mentah di database.
  const raw = requestId
    ? crypto.createHmac('sha256', getPlatformJwtSecret()).update(`activation:${requestId}`).digest('hex').slice(0, 20).toUpperCase()
    : crypto.randomBytes(10).toString('hex').toUpperCase();
  return `LPD-${raw.match(/.{1,4}/g).join('-')}`;
};

const createActivationCode = async ({ prisma, durationDays, validUntil, note, requestId = null }) => {
  const code = generateActivationCode(requestId);
  const activation = await prisma.licenseActivation.create({
    data: {
      codeHash: hashActivationCode(code),
      plan: 'PREMIUM',
      durationDays,
      validUntil: validUntil || null,
      note: note || null,
    },
  });
  return { activation, code };
};

const calculateExtendedExpiry = (currentExpiry, durationDays, now = new Date()) => {
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  return addDays(base, durationDays);
};

module.exports = {
  PLATFORM_ADMIN_AUDIENCE,
  PLATFORM_ADMIN_ISSUER,
  PLATFORM_IDLE_MS,
  PLATFORM_SESSION_MS,
  calculateExtendedExpiry,
  createActivationCode,
  createPlatformSession,
  generateActivationCode,
  getPlatformJwtSecret,
  publicPlatformAdmin,
};
