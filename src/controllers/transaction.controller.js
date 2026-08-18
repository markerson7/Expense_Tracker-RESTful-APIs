import Transaction from '../models/Transaction.model.js';
import { success, error } from '../utils/response.util.js';

const addTransaction = async (req, res) => {
  try {
    const { type, category, amount, date, description } = req.body;
    if (!type || !category || amount == null || !date) {
      return error(res, 'Missing required transaction fields', 400);
    }
    const tx = new Transaction({
      user_id: req.user._id,
      type,
      category,
      amount,
      date,
      description
    });
    await tx.save();
    return success(res, tx.toResponse(), 201);
  } catch (err) {
    return error(res, err.message || 'Failed to add transaction', 500);
  }
};

const getAll = async (req, res) => {
  try {
    const { category, start_date, end_date } = req.query;
    const filter = { user_id: req.user._id };
    if (category) filter.category = category;
    if (start_date || end_date) {
      filter.date = {};
      if (start_date) filter.date.$gte = new Date(start_date);
      if (end_date) filter.date.$lte = new Date(end_date);
    }
    const txs = await Transaction.find(filter).sort({ date: -1 });
    return success(res, txs.map((t) => t.toResponse()));
  } catch (err) {
    return error(res, err.message || 'Failed to fetch transactions', 500);
  }
};

const getOne = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const tx = await Transaction.findOne({ _id: transactionId, user_id: req.user._id });
    if (!tx) return error(res, 'Transaction not found', 404);
    return success(res, tx.toResponse());
  } catch (err) {
    return error(res, err.message || 'Failed to fetch transaction', 500);
  }
};

const updateOne = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const updates = req.body;
    const tx = await Transaction.findOneAndUpdate(
      { _id: transactionId, user_id: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!tx) return error(res, 'Transaction not found', 404);
    return success(res, tx.toResponse());
  } catch (err) {
    return error(res, err.message || 'Failed to update transaction', 500);
  }
};

const deleteOne = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const tx = await Transaction.findOneAndDelete({ _id: transactionId, user_id: req.user._id });
    if (!tx) return error(res, 'Transaction not found', 404);
    return success(res, { message: 'Transaction deleted successfully.' });
  } catch (err) {
    return error(res, err.message || 'Failed to delete transaction', 500);
  }
};



export { addTransaction, getAll, getOne, updateOne, deleteOne };
