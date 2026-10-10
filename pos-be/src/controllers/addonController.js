const { prisma } = require('../config/prisma');

// 1. GET ADDONS BY PRODUCT
exports.getAddonsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const addons = await prisma.productAddon.findMany({
            where: { productId: parseInt(productId) },
            orderBy: { name: 'asc' }
        });

        res.json({ success: true, data: addons });
    } catch (error) {
        console.error("GET ADDONS ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. CREATE ADDON
exports.createAddon = async (req, res) => {
    try {
        const { productId, name, price } = req.body;

        if (!productId || !name) {
            return res.status(400).json({ success: false, message: "Product ID dan nama addon wajib diisi" });
        }
        const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
        if (!product) {
            return res.status(400).json({ success: false, message: 'Produk tidak tersedia pada usaha aktif.' });
        }

        const addon = await prisma.productAddon.create({
            data: {
                productId: parseInt(productId),
                name,
                price: parseFloat(price) || 0
            }
        });

        res.status(201).json({ success: true, message: "Addon berhasil ditambahkan", data: addon });
    } catch (error) {
        console.error("CREATE ADDON ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. UPDATE ADDON
exports.updateAddon = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);

        const addon = await prisma.productAddon.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json({ success: true, message: "Addon berhasil diperbarui", data: addon });
    } catch (error) {
        console.error("UPDATE ADDON ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. DELETE ADDON
exports.deleteAddon = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.productAddon.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: "Addon berhasil dihapus" });
    } catch (error) {
        console.error("DELETE ADDON ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
