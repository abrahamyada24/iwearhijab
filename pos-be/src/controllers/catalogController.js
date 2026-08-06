const { PrismaClient } = require('@prisma/client');
const { serializeProductPrice } = require('../utils/productDiscount');

const prisma = new PrismaClient();

exports.getPublicCatalog = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                OR: [
                    { stock: { gt: 0 } },
                    { isUnlimitedStock: true }
                ]
            },
            include: { category: true },
            orderBy: { name: 'asc' }
        });

        const activeCategoryIds = [...new Set(products.map(product => product.categoryId))];
        const categories = await prisma.category.findMany({
            where: { id: { in: activeCategoryIds } },
            orderBy: { name: 'asc' }
        });

        const settings = await prisma.storeSetting.findFirst();
        const packages = await prisma.package.findMany({
            where: { isActive: true },
            include: { items: { include: { product: true } } },
            orderBy: { name: 'asc' }
        });
        const availablePackages = packages.filter(pkg => pkg.items.length > 0 && pkg.items.every(item =>
            item.product.isActive && (item.product.isUnlimitedStock || item.product.stock >= item.qty)
        ));

        res.status(200).json({
            success: true,
            data: {
                products: products.map(product => serializeProductPrice(product)),
                packages: availablePackages.map(pkg => ({
                    ...pkg,
                    price: Number(pkg.price),
                    categoryId: 'PACKAGE',
                    category: { id: 'PACKAGE', name: 'Paket' },
                    isPackage: true,
                    stock: 999,
                    isUnlimitedStock: true
                })),
                categories,
                settings
            }
        });
    } catch (error) {
        console.error('Error in getPublicCatalog:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat mengambil data katalog.'
        });
    }
};
