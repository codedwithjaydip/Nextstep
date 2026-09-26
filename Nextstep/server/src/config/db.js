import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Set it in server/.env");
    process.exit(1);
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log("[db] connected to MongoDB");
  } catch (err) {
    console.error("[db] failed to connect to MongoDB:", err.message);
    console.error(
      "[db] NextStep cannot persist situations without a database. " +
        "Check your MONGODB_URI in server/.env."
    );
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB connection lost");
  });
}
