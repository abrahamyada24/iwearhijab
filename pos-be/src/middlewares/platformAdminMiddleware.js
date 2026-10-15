const jwt = require('jsonwebtoken');
const { basePrisma } = require('../config/prisma');
const {
  PLATFORM_ADMIN_AUDIENCE,
  PLATFORM_ADMIN_ISSUER,
  PLATFORM_IDLE_MS,
  getPlatformJwtSecret,
  publicPlatformAdmin,
} = require('../services/platformAdminService');

const getBearerToken = (authorization) => {
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  return token && token !== 'null' && token !== 'undefined' ? token : null;
};

const requirePlatformAdmin = async (req, res, next) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ success: false, code: 'PLATFORM_AUTH_REQUIRED', message: 'Login Super Admin diperlukan.' });
  }
  try {
    const decoded = jwt.verify(token, getPlatformJwtSecret(), {
      algorithms: ['HS256'],
      audience: PLATFORM_ADMIN_AUDIENCE,
      issuer: PLATFORM_ADMIN_ISSUER,
    });
    const adminId = Number(decoded.sub);
    if (!decoded.sid || !decoded.jti || decoded.type !== 'PLATFORM_ADMIN' || !Number.isInteger(adminId)) {
      throw new Error('Token platform tidak valid.');
    }
    const session = await basePrisma.platformAdminSession.findUnique({
      where: { id: decoded.sid },
      include: { admin: true },
    });
    const now = new Date();
    const invalid = !session
      || session.jwtId !== decoded.jti
      || session.adminId !== adminId
      || session.revokedAt
      || session.expiresAt <= now
      || !session.admin?.isActive;
    if (invalid) throw new Error('Sesi platform sudah tidak aktif.');
    if (session.lastSeenAt < new Date(now.getTime() - PLATFORM_IDLE_MS)) {
      await basePrisma.platformAdminSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'IDLE_TIMEOUT' },
      });
      return res.status(401).json({ success: false, code: 'PLATFORM_SESSION_EXPIRED', message: 'Sesi Super Admin berakhir karena tidak aktif.' });
    }
    if (now.getTime() - session.lastSeenAt.getTime() > 60 * 1000) {
      await basePrisma.platformAdminSession.update({ where: { id: session.id }, data: { lastSeenAt: now } });
    }
    req.platformAdmin = publicPlatformAdmin(session.admin);
    req.platformAdminSession = { id: session.id };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, code: 'PLATFORM_SESSION_INVALID', message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
  }
};

module.exports = { requirePlatformAdmin };
