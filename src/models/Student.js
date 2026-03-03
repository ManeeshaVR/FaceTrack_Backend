const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    studentNo: { type: Number, required: true, unique: true, index: true },
    fName: { type: String, required: true, trim: true },
    lName: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    grade: { type: Number, enum: [9, 10, 11], required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    dateOfBirth: { type: Date },
    registeredDate: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    embeddings: { type: [[Number]], default: [] }, // up to ~5 vectors
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", StudentSchema);
