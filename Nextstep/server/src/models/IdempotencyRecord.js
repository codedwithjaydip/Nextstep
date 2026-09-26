import mongoose from "mongoose";

const idempotencyRecordSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    candidateId: { type: String, required: true },
    situationId: { type: String, default: null },
    requestHash: { type: String, required: true },
    statusCode: { type: Number, default: null },
    responseBody: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("IdempotencyRecord", idempotencyRecordSchema);
