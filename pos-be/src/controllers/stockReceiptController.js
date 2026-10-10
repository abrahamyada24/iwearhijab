const { prisma } = require('../config/prisma');

// 1. CREATE STOCK RECEIPT (Penerimaan Barang)
exports.createStockReceipt = async (req, res) => {
    try {
        const { notes, createdBy, items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Item penerimaan wajib diisi" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Create receipt header
            const receipt = await tx.stockReceipt.create({
                data: {
                    receivedAt: new Date(),
                    notes: notes || null,
                    createdBy: createdBy || null
                }
            });

            // Process each item
            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: parseInt(item.productId) } });
                if (!product) throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);

                const qtyAdded = parseInt(item.quantityAdded);
                if (qtyAdded <= 0) throw new Error("Jumlah harus lebih dari 0");

                // Create receipt item
                await tx.stockReceiptItem.create({
                    data: {
                        receiptId: receipt.id,
                        productId: product.id,
                        productName: product.name,
                        quantityBefore: product.stock,
                        quantityAdded: qtyAdded,
                        costPrice: parseFloat(item.costPrice) || Number(product.costPrice)
                    }
                });

                // Update product stock
                await tx.product.update({
                    where: { id: product.id },
                    data: { stock: product.stock + qtyAdded }
                });

                // Create stock movement log
                await tx.stockMovement.create({
                    data: {
                        productId: product.id,
                        type: 'IN',
                        qty: qtyAdded,
                        source: 'PURCHASE',
                        description: `Penerimaan barang: ${notes || 'No notes'}`
                    }
                });
            }

            return receipt;
        });

        // Fetch complete receipt with items
        const fullReceipt = await prisma.stockReceipt.findUnique({
            where: { id: result.id },
            include: { items: true }
        });

        res.status(201).json({
            success: true,
            message: "Penerimaan barang berhasil dicatat",
            data: fullReceipt
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. GET ALL STOCK RECEIPTS
exports.getAllStockReceipts = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const whereClause = {};

        if (startDate && endDate) {
            whereClause.receivedAt = {
                gte: new Date(startDate),
                lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        const receipts = await prisma.stockReceipt.findMany({
            where: whereClause,
            include: {
                items: {
                    include: {
                        product: { select: { name: true, sku: true } }
                    }
                }
            },
            orderBy: { receivedAt: 'desc' }
        });

        res.json({ success: true, data: receipts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
