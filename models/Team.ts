import { Schema, model, models } from 'mongoose';

const TeamSchema = new Schema(
  {
    name: { type: String, required: true },
    members: [{ type: String }],
  },
  { timestamps: true }
);

const Team = models.Team || model('Team', TeamSchema);

export default Team;
