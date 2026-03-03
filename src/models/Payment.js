const mongoose = require("mongoose");

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

const PaymentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    paymentDate: { type: Date, default: Date.now },
    month: { type: String, enum: MONTHS, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true },
  },
  { timestamps: true }
);

// prevent paying same month twice for same class+student
PaymentSchema.index({ studentId: 1, classId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Payment", PaymentSchema);
module.exports.MONTHS = MONTHS;
