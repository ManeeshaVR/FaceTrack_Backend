const mongoose = require("mongoose");

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const ClassScheduleSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    classroom: { type: String, required: true, trim: true },
    day: { type: String, enum: DAYS, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClassSchedule", ClassScheduleSchema);
module.exports.DAYS = DAYS;
