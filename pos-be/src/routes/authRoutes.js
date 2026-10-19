const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const authController = require('../controllers/authController');
const mobileBootstrapController = require('../controllers/mobileBootstrapController');
const upload = require('../middlewares/uploadMiddleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    code: 'LOGIN_RATE_LIMITED',
    message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.',
  },
});
const businessRegistrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    code: 'REGISTRATION_RATE_LIMITED',
    message: 'Terlalu banyak pendaftaran dari koneksi ini. Coba lagi nanti.',
  },
});
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Manajemen otentikasi user
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user (Admin/Kasir)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 default: admin@pos.com
 *               password:
 *                 type: string
 *                 format: password
 *                 default: 123456
 *     responses:
 *       200:
 *         description: Login berhasil, token diberikan
 *       401:
 *         description: Email atau Password salah
 */
router.post('/login', loginLimiter, authController.login);
router.post('/register-business', (req, res, next) => {
  if (process.env.PUBLIC_BUSINESS_REGISTRATION !== 'true') {
    return res.status(403).json({ success: false, message: 'Pendaftaran usaha publik dinonaktifkan. Hubungi pengelola toko.' });
  }
  next();
}, businessRegistrationLimiter, authController.registerBusiness);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Mendaftarkan user baru (Support Upload Foto)
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [ADMIN, CASHIER]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User berhasil dibuat
 */
router.post('/register', verifyToken, isAdmin, upload.single('image'), authController.register);

router.put('/change-password', verifyToken, authController.changePassword);

router.get('/me', verifyToken, authController.me);
// Satu request awal untuk Android agar serverless tidak perlu menangani lima
// cold request terpisah. Tetap berada di balik verifyToken dan store context.
router.get('/mobile-bootstrap', verifyToken, mobileBootstrapController.getBootstrap);
router.get('/stores', verifyToken, authController.getStores);
router.post('/active-store', verifyToken, authController.switchStore);
router.post('/logout', verifyToken, authController.logout);
router.post('/logout-all', verifyToken, authController.logoutAll);
router.get('/sessions', verifyToken, authController.getSessions);
router.delete('/sessions/:id', verifyToken, authController.revokeSession);

module.exports = router;
