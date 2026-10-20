const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, isAdmin, expenseController.getAllExpenses);
router.post('/', verifyToken, isAdmin, expenseController.createExpense);
router.delete('/:id', verifyToken, isAdmin, expenseController.deleteExpense);

module.exports = router;
