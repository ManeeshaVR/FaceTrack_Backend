const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: Number, required: true, unique: true, index: true },
    subjectName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", SubjectSchema);
