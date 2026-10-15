const express = require('express');
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/platformAdminController');
const { requirePlatformAdmin } = require('../middlewares/platformAdminMiddleware');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, code: 'PLATFORM_LOGIN_RATE_LIMITED', message: 'Terlalu banyak percobaan login. Coba lagi 15 menit lagi.' },
});

router.post('/auth/login', loginLimiter, controller.login);
router.use(requirePlatformAdmin);
router.get('/auth/me', controller.me);
router.post('/auth/logout', controller.logout);
router.get('/overview', controller.overview);
router.get('/stores', controller.listStores);
router.get('/stores/:id', controller.getStore);
router.patch('/stores/:id/status', controller.updateStoreStatus);
router.patch('/stores/:id/license', controller.updateLicense);
router.get('/activation-codes', controller.listActivationCodes);
router.post('/activation-codes', controller.createActivationCode);
router.get('/audit-logs', controller.listAuditLogs);

module.exports = router;
