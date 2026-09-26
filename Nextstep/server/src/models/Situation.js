import mongoose from "mongoose";

const situationSchema = new mongoose.Schema(
  {
    situationId: { type: String, required: true, unique: true, index: true },
    candidateId: { type: String, required: true, index: true },
    currentVersion: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Situation", situationSchema);
