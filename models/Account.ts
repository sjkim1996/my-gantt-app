import { Schema, model, models } from 'mongoose';
import { UserRole } from '@/lib/authShared';

const AccountSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'lead', 'member'], default: 'member' satisfies UserRole },
    team: { type: String, default: '' },
    label: { type: String, default: '' },
  },
  { timestamps: true }
);

const Account = models.Account || model('Account', AccountSchema);

export default Account;
