const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    classScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSchedule", required: true, index: true },
    markedDate: { type: String, required: true, index: true }, // YYYY-MM-DD (local)
    markedTime: { type: String, required: true }, // HH:mm:ss
    status: { type: String, enum: ["absent", "present"], required: true },
    markedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, enum: ["manual", "face"], default: "manual" },
  },
  { timestamps: true }
);

// Only one mark per day per student per schedule
AttendanceSchema.index({ studentId: 1, classScheduleId: 1, markedDate: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
