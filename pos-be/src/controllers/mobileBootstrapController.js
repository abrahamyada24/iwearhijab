const { prisma } = require('../config/prisma');
const { getLicenseStatus } = require('../services/licenseService');
const { listActiveMemberships, serializeStore } = require('../services/storeAccessService');

const serializeUser = (user, memberships, activeStoreId) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username,
  role: memberships.find((membership) => membership.storeId === activeStoreId)?.role || user.role,
  imageUrl: user.imageUrl,
  mustChangePassword: Boolean(user.mustChangePassword),
  activeStoreId,
  stores: memberships.map(serializeStore),
});

exports.getBootstrap = async (req, res) => {
  try {
    // Jalankan berurutan agar koneksi Prisma/TiDB yang dibatasi pada lingkungan
    // serverless tidak dibanjiri beberapa query ketika instance baru aktif.
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          imageUrl: true,
          isActive: true,
          mustChangePassword: true,
        },
      });
    const memberships = await listActiveMemberships(prisma, req.user.id);
    const settings = await prisma.storeSetting.findFirst();
    const loyalty = await prisma.loyaltyConfig.findFirst();
    const license = await getLicenseStatus(prisma);
    const activeShift = await prisma.shift.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    if (!user?.isActive) {
      return res.status(401).json({
        success: false,
        code: 'USER_INACTIVE',
        message: 'Akun sudah tidak aktif. Silakan login kembali.',
      });
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      data: {
        user: serializeUser(user, memberships, req.storeId),
        settings: settings || { storeName: req.store?.name || 'Iwearing Hijab', enableShift: true },
        loyalty: loyalty || null,
        license,
        shiftEnabled: settings?.enableShift !== false,
        activeShift,
      },
    });
  } catch (error) {
    console.error(`[MOBILE BOOTSTRAP ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      code: 'MOBILE_BOOTSTRAP_FAILED',
      message: 'Data awal aplikasi belum dapat dimuat. Silakan coba lagi.',
    });
  }
};
