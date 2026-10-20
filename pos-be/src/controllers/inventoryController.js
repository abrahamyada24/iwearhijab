const { prisma } = require('../config/prisma');

exports.getStockHistory = async (req, res) => {
  try {
    const history = await prisma.stockMovement.findMany({
        include: {
            product: { 
                select: { 
                    name: true, 
                    sku: true,
                    category: { select: { name: true } }
                } 
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
