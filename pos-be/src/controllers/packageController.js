const { prisma } = require('../config/prisma');
const { getUploadedFileUrl } = require('../utils/uploadedFileUrl');

const parseBoolean = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    return value === true || value === 1 || value === '1' || value === 'true';
};

const parseItems = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    const items = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(items)) throw new Error('Daftar isi paket tidak valid.');
    return items;
};

const validateProducts = async (client, items) => {
    const productIds = [...new Set(items.map(item => Number(item.productId)))];
    if (productIds.some(id => !Number.isInteger(id))) throw new Error('Produk paket tidak valid.');
    const products = await client.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
    if (products.length !== productIds.length) throw new Error('Salah satu produk paket bukan milik usaha aktif.');
};

exports.getAllPackages = async (req, res) => {
    try {
        const packages = await prisma.package.findMany({
            include: {
                items: {
                    include: { product: true }
                }
            }
        });
        res.json({ success: true, data: packages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPackageById = async (req, res) => {
    try {
        const pkg = await prisma.package.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
        res.json({ success: true, data: pkg });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createPackage = async (req, res) => {
    try {
        const { name, description, price, isActive } = req.body;
        const items = parseItems(req.body.items, []);
        await validateProducts(prisma, items);
        const imageUrl = getUploadedFileUrl(req.file);
        
        const newPackage = await prisma.package.create({
            data: {
                name,
                description,
                imageUrl,
                price: parseFloat(price),
                isActive: parseBoolean(isActive, true),
                items: {
                    create: items.map(item => ({
                        productId: parseInt(item.productId),
                        qty: parseInt(item.qty || 1)
                    }))
                }
            },
            include: { items: true }
        });
        res.status(201).json({ success: true, data: newPackage, message: 'Package created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updatePackage = async (req, res) => {
    try {
        const { name, description, price, isActive } = req.body;
        const items = parseItems(req.body.items, undefined);
        const packageId = Number(req.params.id);

        const updatedPackage = await prisma.$transaction(async (tx) => {
            const existingPackage = await tx.package.findUnique({ where: { id: packageId } });
            if (!existingPackage) throw new Error('Package not found');
            if (items !== undefined) await validateProducts(tx, items);
            // Delete old items
            if (items !== undefined) {
                await tx.packageItem.deleteMany({ where: { packageId } });
            }

            // Update package
            return await tx.package.update({
                where: { id: packageId },
                data: {
                    name: name !== undefined ? name : undefined,
                    description: description !== undefined ? description : undefined,
                    price: price !== undefined && price !== '' ? parseFloat(price) : undefined,
                    isActive: isActive !== undefined ? parseBoolean(isActive, true) : undefined,
                    imageUrl: req.file ? getUploadedFileUrl(req.file) : undefined,
                    ...(items !== undefined && {
                        items: {
                            create: items.map(item => ({
                                productId: parseInt(item.productId),
                                qty: parseInt(item.qty || 1)
                            }))
                        }
                    })
                },
                include: { items: { include: { product: true } } }
            });
        });

        res.json({ success: true, data: updatedPackage, message: 'Package updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deletePackage = async (req, res) => {
    try {
        const packageId = Number(req.params.id);
        const existingPackage = await prisma.package.findUnique({ where: { id: packageId } });
        if (!existingPackage) return res.status(404).json({ success: false, message: 'Package not found' });
        
        await prisma.$transaction([
            prisma.packageItem.deleteMany({ where: { packageId } }),
            prisma.package.delete({ where: { id: packageId } })
        ]);

        res.json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
