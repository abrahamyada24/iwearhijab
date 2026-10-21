const { calculateRewardRedemption } = require('../services/rewardRedemptionService');
const { basePrisma, prisma, runWithStore } = require('../config/prisma');
const { getProductPrice } = require('../utils/productDiscount');
const { normalizePaymentType, resolvePaymentMethod } = require('../services/paymentMethodService');
const { resolveSelectedAddons, buildAddonItemNotes, calculateAddonAwareLinePricing } = require('../services/productAddonService');
const { calculateCheckoutTotals } = require('../services/checkoutTotalsService');
const { awardTransactionPoints, reverseTransactionPoints } = require('../services/transactionLoyaltyService');

const normalizeIdempotencyKey = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const key = String(value).trim();
    if (!/^[A-Za-z0-9._:-]{8,64}$/.test(key)) {
        const error = new Error('Idempotency key tidak valid.');
        error.code = 'INVALID_IDEMPOTENCY_KEY';
        throw error;
    }
    return key;
};

const idempotencyTransactionId = (storeId, key) => key ? `api:${storeId}:${key}` : null;

const findIdempotentTransaction = (clientTransactionId) => clientTransactionId
    ? prisma.transaction.findFirst({
        where: { androidId: clientTransactionId },
        include: { items: true, payments: true }
    })
    : null;

const sendTransactionResult = (res, transaction, replayed = false) => {
    res.set('Idempotency-Replayed', replayed ? 'true' : 'false');
    return res.status(replayed ? 200 : 201).json({
        success: true,
        message: replayed ? 'Transaksi sebelumnya ditemukan dan digunakan kembali.' : 'Transaksi berhasil dibuat!',
        idempotentReplay: replayed,
        data: transaction
    });
};


/**
 * HELPER: Generate Invoice Number Otomatis dengan Suffix Unik
 * Nomor invoice unik per transaksi.
 */
const generateInvoiceNumber = async (tx) => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}${mm}${dd}`;

    const lastTransaction = await tx.transaction.findFirst({
        where: { invoiceNumber: { contains: `INV/${todayStr}` } },
        orderBy: { id: 'desc' }
    });

    let sequence = 1;
    if (lastTransaction) {
        const parts = lastTransaction.invoiceNumber.split('/');
        if (parts.length >= 3) {
            const cleanSeq = parts[2].split('-')[0];
            sequence = parseInt(cleanSeq) + 1;
        }
    }

    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `INV/${todayStr}/${String(sequence).padStart(4, '0')}-${randomSuffix}`;
};

/**
 * 1. CREATE TRANSACTION (CHECKOUT)
 */
exports.createTransaction = async (req, res) => {
    let clientTransactionId = null;
    try {
        const idempotencyKey = normalizeIdempotencyKey(
            req.get('Idempotency-Key') || req.body?.idempotencyKey
        );
        clientTransactionId = idempotencyTransactionId(req.storeId, idempotencyKey);

        const existingTransaction = await findIdempotentTransaction(clientTransactionId);
        if (existingTransaction) return sendTransactionResult(res, existingTransaction, true);

        const {
            userId, customerId, customerName, items, payment,
            orderType, note,
            preOrderDate, discountAmount, discountType,
            loyaltyPointsRedeemed
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Keranjang kosong!" });
        }

        if (orderType === 'PRE_ORDER' || preOrderDate || items.some(item => item.packageId || String(item.productId).startsWith('pkg-'))) {
            return res.status(400).json({ success: false, message: 'Preorder dan paket produk sudah dihapus.' });
        }
        const requestedPaymentType = normalizePaymentType(payment?.type);
        if (!requestedPaymentType) {
            return res.status(400).json({ success: false, message: "Metode pembayaran wajib dipilih." });
        }

        const result = await prisma.$transaction(async (tx) => {
            if (clientTransactionId) {
                const existing = await tx.transaction.findFirst({
                    where: { androidId: clientTransactionId },
                    include: { items: true, payments: true }
                });
                if (existing) return { transaction: existing, replayed: true };
            }

            if (customerId) {
                const customer = await tx.customer.findUnique({ where: { id: parseInt(customerId) } });
                if (!customer) throw new Error('Pelanggan tidak tersedia pada usaha aktif.');
            }
            const setting = await tx.storeSetting.findFirst();
            const { paymentType, isInstantPayment } = resolvePaymentMethod(requestedPaymentType);
            const shiftEnabled = setting?.enableShift !== false;
            const activeShift = shiftEnabled
                ? await tx.shift.findFirst({
                    where: { status: 'OPEN' },
                    orderBy: { openedAt: 'desc' }
                })
                : null;

            if (shiftEnabled && !activeShift) {
                const shiftError = new Error('Buka shift terlebih dahulu sebelum memproses transaksi.');
                shiftError.code = 'SHIFT_REQUIRED';
                throw shiftError;
            }

            let subTotal = 0;
            const transactionItemsData = [];
            const stockDeductions = new Map();
            const addStockDeduction = (product, qty) => {
                const current = stockDeductions.get(product.id);
                stockDeductions.set(product.id, { product, qty: (current?.qty || 0) + qty });
            };

            // Validasi produk dan hitung total
            for (const item of items) {
                const requestedQty = Number(item.qty);
                if (!Number.isSafeInteger(requestedQty) || requestedQty < 1) throw new Error('Jumlah produk tidak valid.');

                const product = await tx.product.findUnique({
                    where: { id: parseInt(item.productId) },
                    include: { addons: true }
                });

                if (!product || !product.isActive) {
                    throw new Error(`Produk tidak valid.`);
                }
                // Skip stock check for unlimited stock products
                if (!product.isUnlimitedStock && product.stock < requestedQty) {
                    throw new Error(`Stok ${product.name} tidak mencukupi.`);
                }

                const priceInfo = getProductPrice(product);
                const selectedAddons = resolveSelectedAddons(
                    product.addons,
                    item.addons ?? item.addonSelections ?? item.addonIds,
                    product.name
                );
                const { lineTotal, price, originalPrice } = calculateAddonAwareLinePricing(priceInfo, selectedAddons, requestedQty);
                const itemNotes = buildAddonItemNotes(selectedAddons, item.notes);
                subTotal += lineTotal;
                addStockDeduction(product, requestedQty);

                transactionItemsData.push({
                    productId: product.id,
                    qty: requestedQty,
                    price,
                    originalPrice,
                    discountAmount: priceInfo.discountAmount,
                    costPrice: product.costPrice,
                    loyaltyRewardQty: Number(item.loyaltyRewardQty || 0),
                    loyaltyRewardDiscount: price * Number(item.loyaltyRewardQty || 0),
                    notes: itemNotes
                });

            }

            for (const { product, qty } of stockDeductions.values()) {
                if (!product.isUnlimitedStock && product.stock < qty) {
                    throw new Error(`Stok ${product.name} tidak mencukupi.`);
                }
            }

            // Hitung pajak
            const taxRate = setting?.taxRate ? Number(setting.taxRate) / 100 : 0;

            const loyaltyConfig = await tx.loyaltyConfig.findFirst({ where: { isActive: true } });
            const loyaltyCustomer = customerId ? await tx.customer.findUnique({ where: { id: parseInt(customerId) } }) : null;
            const redemption = calculateRewardRedemption({ lines: transactionItemsData, points: loyaltyPointsRedeemed, customer: loyaltyCustomer, config: loyaltyConfig });
            const redeemedPoints = redemption.points;
            const loyaltyDiscount = redemption.discount;
            const { discount, taxAmount, grandTotal } = calculateCheckoutTotals({ subTotal, taxRate, discountAmount, discountType, loyaltyDiscount });
            if (paymentType === 'POINT' && (grandTotal !== 0 || redeemedPoints === 0)) throw new Error('Pembayaran poin harus melunasi tagihan. Bayar sisanya dengan Cash atau QRIS.');
            const cashAmount = paymentType === 'CASH' ? Number(payment.cashAmount) : null;
            if (paymentType === 'CASH' && (!Number.isFinite(cashAmount) || cashAmount < grandTotal)) throw new Error('Uang tunai belum mencukupi tagihan.');

            // Generate Invoice unik
            const invoiceNumber = await generateInvoiceNumber(tx);

            const initialStatus = isInstantPayment ? 'PAID' : 'PENDING';
            const paymentStatus = isInstantPayment ? 'SETTLEMENT' : 'PENDING';

            // Pembayaran manual langsung dikonfirmasi kasir dan mengurangi stok.
            if (isInstantPayment) {
                for (const { product, qty } of stockDeductions.values()) {
                    // Skip stock deduction for unlimited stock products
                    if (!product.isUnlimitedStock) {
                        // Pengurangan atomik tetap mencegah overselling ketika dua
                        // kasir checkout bersamaan pada isolation level TiDB.
                        const stockUpdate = await tx.product.updateMany({
                            where: {
                                id: product.id,
                                isUnlimitedStock: false,
                                stock: { gte: qty }
                            },
                            data: { stock: { decrement: qty } }
                        });
                        if (stockUpdate.count !== 1) {
                            throw new Error(`Stok ${product.name} tidak mencukupi.`);
                        }
                    }

                    await tx.stockMovement.create({
                        data: {
                            productId: product.id,
                            type: 'OUT',
                            qty,
                            source: 'SALE',
                            description: `Penjualan ${paymentType} - ${invoiceNumber}`
                        }
                    });
                }
            }

            // Buat transaksi
            const newTransaction = await tx.transaction.create({
                data: {
                    androidId: clientTransactionId,
                    shiftId: activeShift?.id || null,
                    userId: req.user.id,
                    customerId: customerId ? parseInt(customerId) : null,
                    customerName: customerName || null,
                    invoiceNumber,
                    subTotal,
                    taxAmount,
                    discountAmount: discount,
                    grandTotal,
                    cashAmount,
                    changeAmount: paymentType === 'CASH' ? cashAmount - grandTotal : 0,
                    status: initialStatus,
                    workStatus: req.store?.type === 'LAUNDRY' ? 'RECEIVED' : null,
                    orderType: 'TAKE_AWAY',
                    tableNumber: null,
                    note: note || null,
                    preOrderDate: null,
                    preOrderConfirmed: false,
                    items: { create: transactionItemsData },
                    payments: {
                        create: {
                            paymentType,
                            amount: grandTotal,
                            paymentStatus: paymentStatus
                        }
                    }
                },
                include: { items: true, payments: true }
            });

            const loyaltySnapshot = await awardTransactionPoints(tx, newTransaction, redeemedPoints);
            if (loyaltySnapshot) Object.assign(newTransaction, loyaltySnapshot);

            return {
                transaction: newTransaction,
                replayed: false
            };
        }, {
            timeout: 10000,
            // TiDB menggunakan Snapshot Isolation yang diekspos sebagai
            // REPEATABLE READ dan menolak SERIALIZABLE.
            isolationLevel: 'RepeatableRead'
        });

        return sendTransactionResult(res, result.transaction, result.replayed);

    } catch (error) {
        // Dua request dengan key yang sama dapat tiba bersamaan. Constraint
        // unik androidId membuat hanya satu transaksi yang commit; request lain
        // mengembalikan hasil yang sudah tersimpan tanpa mengulang efek samping.
        if (error.code === 'P2002' && clientTransactionId) {
            const existingTransaction = await findIdempotentTransaction(clientTransactionId);
            if (existingTransaction) return sendTransactionResult(res, existingTransaction, true);
        }
        console.error('[ERROR] Transaction Error:', error.message);
        const isTransactionConflict = error.code === 'P2034';
        const isDatabaseError = String(error.code || '').startsWith('P')
            || /error in connector|error querying the database|can't reach database server/i.test(String(error.message || ''));
        const status = error.code === 'INVALID_IDEMPOTENCY_KEY'
            ? 400
            : error.code === 'SHIFT_REQUIRED'
            ? 409
            : isTransactionConflict
                ? 409
                : isDatabaseError
                    ? 503
                    : 400;
        const publicMessage = isTransactionConflict
            ? 'Transaksi berbenturan dengan perubahan lain. Periksa stok lalu coba kembali.'
            : isDatabaseError
                ? 'Database sedang tidak siap memproses transaksi. Coba kembali beberapa saat lagi.'
                : error.message;

        res.status(status).json({
            success: false,
            code: isTransactionConflict ? 'TRANSACTION_CONFLICT' : (isDatabaseError ? 'DATABASE_UNAVAILABLE' : (error.code || 'TRANSACTION_FAILED')),
            message: publicMessage
        });
    }
};

/**
 * 2. GET ALL TRANSACTIONS
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, startDate, endDate } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const whereClause = {};

        if (status) whereClause.status = status;
        const searchTerm = typeof search === 'string' ? search.trim() : '';
        if (searchTerm) {
            whereClause.OR = [
                { invoiceNumber: { contains: searchTerm } },
                { customer: { is: { name: { contains: searchTerm } } } },
                { customer: { is: { memberId: { contains: searchTerm } } } },
                // Keep the member name recorded at checkout searchable after a rename.
                { customerId: { not: null }, customerName: { contains: searchTerm } },
            ];
        }
        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate + 'T00:00:00'),
                lte: new Date(endDate + 'T23:59:59')
            };
        }

        const [transactions, total] = await prisma.$transaction([
            prisma.transaction.findMany({
                where: whereClause,
                include: {
                    user: { select: { name: true } },
                    customer: { select: { name: true } },
                    payments: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.transaction.count({ where: whereClause })
        ]);

        res.json({
            success: true,
            data: transactions,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[ERROR] Get Transactions Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 3. GET TRANSACTION BY ID
 */
exports.getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: { select: { name: true } },
                customer: { select: { name: true, phone: true } },
                items: { include: { product: { select: { name: true, sku: true } } } },
                payments: true
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaksi tidak ditemukan"
            });
        }

        const storeSettings = await prisma.storeSetting.findFirst();
        res.json({
            success: true,
            data: transaction,
            store: storeSettings
        });
    } catch (error) {
        console.error('[ERROR] Get Transaction Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateWorkStatus = async (req, res) => {
    try {
        if (req.store?.type !== 'LAUNDRY') {
            return res.status(400).json({ success: false, message: 'Status pengerjaan hanya tersedia untuk usaha laundry.' });
        }
        const workStatus = String(req.body?.workStatus || '').toUpperCase();
        const allowed = ['RECEIVED', 'PROCESSING', 'READY', 'PICKED_UP'];
        if (!allowed.includes(workStatus)) {
            return res.status(400).json({ success: false, message: 'Status pengerjaan tidak valid.' });
        }
        const existing = await prisma.transaction.findUnique({ where: { id: Number(req.params.id) } });
        if (!existing) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
        const transaction = await prisma.transaction.update({
            where: { id: existing.id },
            data: { workStatus }
        });
        return res.json({ success: true, message: 'Status pengerjaan diperbarui.', data: transaction });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 4. WEBHOOK HANDLER - PENTING: Ini yang sinkronkan status payment
 */
exports.returnTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(id) },
            include: { items: true }
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" });
        }

        if (transaction.status === 'RETURNED') {
            return res.status(400).json({ success: false, message: "Transaksi sudah diretur" });
        }

        if (transaction.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: "Tidak bisa meretur transaksi yang sudah dibatalkan" });
        }

        await prisma.$transaction(async (tx) => {
            // Update transaction status
            const changed = await tx.transaction.updateMany({
                where: { id: parseInt(id), status: { in: ['PAID', 'COMPLETED'] } },
                data: { status: 'RETURNED' }
            });
            if (changed.count !== 1) throw new Error('Hanya transaksi lunas yang dapat diretur atau transaksi sudah diproses.');
            await reverseTransactionPoints(tx, transaction);

            // Revert stock
            for (const item of transaction.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (product && !product.isUnlimitedStock) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: product.stock + item.qty }
                    });
                }

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: 'IN',
                        qty: item.qty,
                        source: 'RETURN',
                        description: `Retur transaksi - ${transaction.invoiceNumber}`
                    }
                });
            }

        });

        res.json({ success: true, message: "Transaksi berhasil diretur, stok dikembalikan" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
