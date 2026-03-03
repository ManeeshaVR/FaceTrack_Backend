const mongoose = require("mongoose");

const EnrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    enrollmentDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate enrollment - allow only one record per student+class
EnrollmentSchema.index({ studentId: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", EnrollmentSchema);
