import Transaction from '../models/Transaction.model.js';
import { success, error } from '../utils/response.util.js';

const getSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const incomeAgg = await Transaction.aggregate([
      { $match: { user_id: userId, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expenseAgg = await Transaction.aggregate([
      { $match: { user_id: userId, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const total_income = incomeAgg[0]?.total || 0;
    const total_expenses = expenseAgg[0]?.total || 0;
    const balance = total_income - total_expenses;

    return success(res, { total_income, total_expenses, balance });
  } catch (err) {
    return error(res, err.message || 'Failed to get summary', 500);
  }
};

export { getSummary };
