const { prisma } = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('../config/auth');
const { normalizeUsername, validateUsername } = require('../services/usernameService');
const { getUploadedFileUrl } = require('../utils/uploadedFileUrl');

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  imageUrl: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
};

/**
 * 1. GET ALL USERS
 * Mengambil daftar seluruh pegawai untuk manajemen tim.
 */
exports.getAllUsers = async (req, res) => {
  try {
    const memberships = await prisma.storeMembership.findMany({
      where: { storeId: req.storeId },
      include: { user: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' }
    });
    const users = memberships.map(({ user, role, isActive }) => ({ ...user, role, isActive }));
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 2. UPDATE USER
 * Mengupdate profil pegawai, role, status aktif, atau reset password.
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, username, role, password, currentPassword, isActive } = req.body;
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'ID pengguna tidak valid.' });
    }

    const targetMembership = await prisma.storeMembership.findUnique({
      where: { userId_storeId: { userId, storeId: req.storeId } },
      include: { user: true },
    });
    if (!targetMembership) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan pada usaha aktif.' });
    const targetUser = targetMembership.user;
    if (targetMembership.role === 'OWNER' && req.user.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Hanya Owner yang dapat mengubah akun Owner.' });
    }

    const dataToUpdate = {};
    let nextRole = targetMembership.role;
    const membershipCount = await prisma.storeMembership.count({ where: { userId } });
    const changesGlobalIdentity = Boolean(name || email || username !== undefined || password || req.file);
    if (membershipCount > 1 && changesGlobalIdentity && req.user.id !== userId) {
      return res.status(409).json({
        success: false,
        message: 'Akun ini dipakai di beberapa usaha. Profil dan password hanya dapat diubah oleh pemilik akun.',
      });
    }

    if (name) dataToUpdate.name = String(name).trim();
    if (email) dataToUpdate.email = String(email).trim().toLowerCase();
    if (username !== undefined) {
      const normalizedUsername = normalizeUsername(username);
      const usernameError = validateUsername(normalizedUsername);
      if (usernameError) return res.status(400).json({ success: false, message: usernameError });
      dataToUpdate.username = normalizedUsername;
    }

    const ownerIdentityChanged = targetMembership.role === 'OWNER' && (
      (dataToUpdate.email && dataToUpdate.email !== targetUser.email) ||
      (dataToUpdate.username && dataToUpdate.username !== targetUser.username)
    );
    if (ownerIdentityChanged) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password Owner saat ini wajib diisi untuk mengganti email atau username.',
        });
      }
      const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
      const passwordMatches = requester && await bcrypt.compare(String(currentPassword), requester.password);
      if (!passwordMatches) {
        return res.status(401).json({ success: false, message: 'Password Owner saat ini salah.' });
      }
    }
    if (role) {
      const normalizedRole = String(role).toUpperCase();
      if (!['OWNER', 'ADMIN', 'CASHIER'].includes(normalizedRole)) {
        return res.status(400).json({ success: false, message: 'Role pengguna tidak valid.' });
      }
      if (normalizedRole === 'OWNER' && req.user.role !== 'OWNER') {
        return res.status(403).json({ success: false, message: 'Hanya Owner yang dapat memberikan role Owner.' });
      }
      // Role adalah hak akses per usaha, bukan atribut global akun.
      nextRole = normalizedRole;
    }

    const nextMembershipActive = isActive !== undefined
      ? isActive === 'true' || isActive === true
      : targetMembership.isActive;

    // Jika admin mengisi password baru, lakukan hashing
    if (password && password.trim() !== "") {
      const passwordError = validatePassword(password);
      if (passwordError) return res.status(400).json({ success: false, message: passwordError });
      dataToUpdate.password = await bcrypt.hash(password, 12);
      dataToUpdate.mustChangePassword = true;
      dataToUpdate.passwordChangedAt = new Date();
    }

    /**
     * LOGIKA PENYIMPANAN LOKAL:
     * Menggunakan req.file.filename untuk menyimpan path relatif folder uploads.
     */
    if (req.file) {
      dataToUpdate.imageUrl = getUploadedFileUrl(req.file);
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = Object.keys(dataToUpdate).length > 0
        ? await tx.user.update({ where: { id: userId }, data: dataToUpdate, select: publicUserSelect })
        : await tx.user.findUnique({ where: { id: userId }, select: publicUserSelect });
      const updatedMembership = await tx.storeMembership.update({
        where: { userId_storeId: { userId, storeId: req.storeId } },
        data: {
          role: nextRole,
          isActive: nextMembershipActive,
        },
      });
      if (password || !nextMembershipActive) {
        await tx.authSession.updateMany({
          where: {
            userId,
            revokedAt: null,
            ...(password ? {} : { activeStoreId: req.storeId }),
          },
          data: { revokedAt: new Date(), revokeReason: password ? 'ADMIN_PASSWORD_RESET' : 'STORE_ACCESS_REVOKED' },
        });
      }
      return { ...updatedUser, role: updatedMembership.role, isActive: updatedMembership.isActive };
    });

    res.json({ success: true, message: "Data pengguna diperbarui", data: user });
  } catch (error) {
    if (error?.code === 'P2002') {
      const field = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
      return res.status(409).json({
        success: false,
        message: field.includes('username') ? 'Username sudah digunakan.' : 'Email sudah digunakan.',
      });
    }
    res.status(500).json({ success: false, message: 'Data pengguna belum dapat diperbarui.' });
  }
};

/**
 * 3. DELETE USER
 * Menghapus akun pegawai dari sistem.
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    // Proteksi: Mencegah admin menghapus akunnya sendiri secara tidak sengaja
    if (req.user.id === userId) {
      return res.status(400).json({ success: false, message: "Akses ditolak! Anda tidak bisa menghapus akun Anda sendiri." });
    }

    const targetMembership = await prisma.storeMembership.findUnique({
      where: { userId_storeId: { userId, storeId: req.storeId } },
    });
    if (!targetMembership) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan pada usaha aktif.' });
    if (targetMembership.role === 'OWNER') {
      return res.status(403).json({ success: false, message: 'Akun Owner tidak dapat dihapus.' });
    }

    await prisma.$transaction([
      prisma.authSession.updateMany({
        where: { userId, activeStoreId: req.storeId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'STORE_ACCESS_REVOKED' },
      }),
      prisma.storeMembership.delete({ where: { userId_storeId: { userId, storeId: req.storeId } } }),
    ]);
    res.json({ success: true, message: "Akses pengguna dari usaha ini berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
