const { basePrisma, prisma, runWithStore } = require('../config/prisma');
const { serializeProductPrice } = require('../utils/productDiscount');


exports.getPublicCatalog = async (req, res) => {
    try {
        const requestedSlug = String(req.query.store || req.query.storeSlug || '').trim().toLowerCase();
        const store = await basePrisma.store.findFirst({
            where: requestedSlug
                ? { slug: requestedSlug, isActive: true, isPublicDemo: true }
                : { isActive: true, isPublicDemo: true },
            orderBy: { id: 'asc' }
        });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: requestedSlug ? 'Katalog usaha tidak ditemukan.' : 'Belum ada katalog demo publik.'
            });
        }

        const data = await runWithStore(store.id, async () => {
          const products = await prisma.product.findMany({
            where: {
                isActive: true,
                OR: [
                    { stock: { gt: 0 } },
                    { isUnlimitedStock: true }
                ]
            },
            include: { category: true, addons: true },
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

          return {
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
                settings,
                store: { id: store.id, slug: store.slug, name: store.name, type: store.type }
            };
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error in getPublicCatalog:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat mengambil data katalog.'
        });
    }
};
