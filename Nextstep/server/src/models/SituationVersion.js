import mongoose from "mongoose";

const situationVersionSchema = new mongoose.Schema(
  {
    situationId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    inputText: { type: String, required: true },
    analysis: { type: mongoose.Schema.Types.Mixed, required: true },
    changes: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

situationVersionSchema.index({ situationId: 1, version: 1 }, { unique: true });

export default mongoose.model("SituationVersion", situationVersionSchema);
