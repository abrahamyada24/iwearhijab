const { prisma } = require('../config/prisma');

exports.getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany();
        res.json({ success: true, data: suppliers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getSupplierById = async (req, res) => {
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
        res.json({ success: true, data: supplier });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createSupplier = async (req, res) => {
    try {
        const { name, phone, address, notes } = req.body;
        const newSupplier = await prisma.supplier.create({
            data: { name, phone, address, notes }
        });
        res.status(201).json({ success: true, data: newSupplier, message: 'Supplier created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateSupplier = async (req, res) => {
    try {
        const { name, phone, address, notes } = req.body;
        const updatedSupplier = await prisma.supplier.update({
            where: { id: Number(req.params.id) },
            data: { name, phone, address, notes }
        });
        res.json({ success: true, data: updatedSupplier, message: 'Supplier updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteSupplier = async (req, res) => {
    try {
        await prisma.supplier.delete({
            where: { id: Number(req.params.id) }
        });
        res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
