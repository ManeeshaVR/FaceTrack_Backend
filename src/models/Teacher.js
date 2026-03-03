const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema(
  {
    teacherNo: { type: Number, required: true, unique: true, index: true },
    fName: { type: String, required: true, trim: true },
    lName: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    dateOfBirth: { type: Date },
    joinedDate: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", TeacherSchema);
