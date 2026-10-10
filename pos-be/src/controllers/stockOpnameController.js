const { prisma } = require('../config/prisma');

// 1. GET STOCK FOR OPNAME — Returns all products with system stock
exports.getStockForOpname = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: {
                category: { select: { name: true } }
            },
            orderBy: [
                { category: { name: 'asc' } },
                { name: 'asc' }
            ]
        });

        const data = products.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            categoryName: p.category?.name || '-',
            systemStock: p.stock,
            isUnlimitedStock: p.isUnlimitedStock
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. SUBMIT STOCK OPNAME — Bulk update stock from physical count
exports.submitStockOpname = async (req, res) => {
    try {
        const { items } = req.body;
        // items = [{ productId, physicalQty }, ...]

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Data opname wajib diisi" });
        }

        const results = await prisma.$transaction(async (tx) => {
            const adjustments = [];

            for (const item of items) {
                const productId = parseInt(item.productId);
                const physicalQty = parseInt(item.physicalQty);

                const product = await tx.product.findUnique({ where: { id: productId } });
                if (!product) continue;

                const diff = physicalQty - product.stock;
                if (diff === 0) continue; // No change needed

                // Update product stock
                await tx.product.update({
                    where: { id: productId },
                    data: { stock: physicalQty }
                });

                // Log stock movement
                await tx.stockMovement.create({
                    data: {
                        productId,
                        type: diff > 0 ? 'IN' : 'OUT',
                        qty: Math.abs(diff),
                        source: 'ADJUSTMENT',
                        description: `Stock Opname: Stok sistem ${product.stock} → fisik ${physicalQty} (selisih ${diff > 0 ? '+' : ''}${diff})`
                    }
                });

                adjustments.push({
                    productId,
                    productName: product.name,
                    systemStock: product.stock,
                    physicalQty,
                    difference: diff
                });
            }

            return adjustments;
        });

        res.json({
            success: true,
            message: `Stock opname selesai. ${results.length} produk diperbarui.`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
