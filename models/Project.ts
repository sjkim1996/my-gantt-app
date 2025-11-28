import { Schema, model, models } from 'mongoose';

const ProjectSchema = new Schema({
  name: { type: String, required: true },
  person: { type: String, required: true },
  team: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  colorIdx: { type: Number, default: 0 },
  docUrl: { type: String },
  docName: { type: String },
  isTentative: { type: Boolean, default: false },
  customColor: { type: String },
  notes: { type: String },
  milestones: [{
    id: { type: String, required: true },
    label: { type: String, required: true },
    date: { type: String, required: true },
    color: { type: String },
  }],
  vacations: [{
    id: { type: String, required: true },
    label: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    color: { type: String },
  }],
}, { timestamps: true });

// 이미 모델이 있으면 그것을 쓰고, 없으면 새로 만듭니다.
const Project = models.Project || model('Project', ProjectSchema);

export default Project;
