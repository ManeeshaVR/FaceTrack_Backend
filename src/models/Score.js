const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    grade: { type: Number, enum: [9, 10, 11], required: true, index: true },
    term: { type: Number, enum: [1, 2, 3], required: true, index: true },
    marks: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

ScoreSchema.index({ studentId: 1, subjectId: 1, grade: 1, term: 1 }, { unique: true });

module.exports = mongoose.model("Score", ScoreSchema);
