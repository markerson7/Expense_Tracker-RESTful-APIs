import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone_number: { type: String },
  password: { type: String, required: true },
  status: { type: String, enum: ['active', 'banned'], default: 'active' },
  created_on: { type: Date, default: Date.now }
});

// Hash before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toResponse = function () {
  return {
    id: this._id,
    first_name: this.first_name,
    last_name: this.last_name,
    email: this.email,
    phone_number: this.phone_number,
    created_on: this.created_on,
    status: this.status
  };
};

const User = mongoose.model('User', userSchema);
export default User;
