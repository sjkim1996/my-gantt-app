import { Schema, model, models } from 'mongoose';

const VacationSchema = new Schema(
  {
    person: { type: String, required: true },
    team: { type: String, required: true },
    label: { type: String },
    start: { type: String, required: true },
    end: { type: String, required: true },
    color: { type: String, default: '#0f172a' },
  },
  { timestamps: true }
);

const Vacation = models.Vacation || model('Vacation', VacationSchema);

export default Vacation;
