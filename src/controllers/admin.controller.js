import User from '../models/User.model.js';
import Transaction from '../models/Transaction.model.js';
import { success, error } from '../utils/response.util.js';

const listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ created_on: -1 });
    const data = users.map(u => ({
      id: u._id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone_number: u.phone_number,
      created_on: u.created_on,
      status: u.status
    }));
    return success(res, data);
  } catch (err) {
    return error(res, 'Failed to fetch users', 500);
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'banned'].includes(status)) {
      return error(res, 'Invalid status', 400);
    }
    const user = await User.findById(id);
    if (!user) return error(res, 'User not found', 404);
    user.status = status;
    await user.save();
    return success(res, {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      status: user.status
    });
  } catch (err) {
    return error(res, err.message || 'Failed to update status', 500);
  }
};

const transactionsAnalytics = async (req, res) => {
  try {
    const userId = req.user._id; // if admin wants all, remove this filter
    // Group by category, compute income and expense totals
    const pipeline = [
      {
        $group: {
          _id: {
            category: '$category',
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id.category',
          type: '$_id.type',
          total: 1,
          _id: 0
        }
      }
    ];
    const grouped = await Transaction.aggregate(pipeline);
    // reshape
    const map = {};
    grouped.forEach(item => {
      if (!map[item.category]) {
        map[item.category] = { category: item.category, total_income: 0, total_expense: 0 };
      }
      if (item.type === 'income') map[item.category].total_income = item.total;
      if (item.type === 'expense') map[item.category].total_expense = item.total;
    });
    const result = Object.values(map);
    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to get analytics', 500);
  }
};

export { listUsers, updateStatus, transactionsAnalytics };
