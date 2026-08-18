import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, default: '' },
  created_on: { type: Date, default: Date.now }
});

transactionSchema.methods.toResponse = function () {
  return {
    id: this._id,
    type: this.type,
    category: this.category,
    amount: this.amount,
    date: this.date,
    description: this.description
  };
};

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
