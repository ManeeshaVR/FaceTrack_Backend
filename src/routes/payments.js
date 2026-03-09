const express = require("express");
const { z } = require("zod");
const Payment = require("../models/Payment");
const { authRequired, requireRoles } = require("../middleware/auth");
const { getStudentByUser } = require("../utils/currentProfile");
const { sendPaymentConfirmationEmail } = require("../utils/email");

const router = express.Router();

// list payments (admin/super_admin)
router.get("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const { studentId, classId, month } = req.query;
  const filter = {};
  if (studentId) filter.studentId = studentId;
  if (classId) filter.classId = classId;
  if (month) filter.month = String(month).toLowerCase();

  const docs = await Payment.find(filter)
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .sort({ paymentDate: -1 });

  res.json({ success: true, data: docs });
});

// my payments (student)
router.get("/my", authRequired, requireRoles("student"), async (req, res) => {
  const student = await getStudentByUser(req.user.userId);
  if (!student) return res.status(404).json({ success: false, error: "Student profile not found" });

  const docs = await Payment.find({ studentId: student._id })
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .sort({ paymentDate: -1 });

  res.json({ success: true, data: docs });
});

// create payment (admin/super_admin)
router.post("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    studentId: z.string().min(1),
    classId: z.string().min(1),
    month: z.enum(["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]),
    amount: z.number().nonnegative(),
    paymentDate: z.string().optional(),
    reference: z.string().optional().default(""),
  });
  const body = schema.parse(req.body);

  const existing = await Payment.findOne({ studentId: body.studentId, classId: body.classId, month: body.month });
  if (existing) return res.status(400).json({ success: false, error: "Student has already done the payment for this class for the selected month" });

  const doc = await Payment.create({
    ...body,
    paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
  });

  const populated = await Payment.findById(doc._id)
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] });

  // Send payment confirmation email
  if (populated.studentId && populated.classId) {
    sendPaymentConfirmationEmail(populated, populated.studentId, populated.classId).catch(console.error);
  }

  res.status(201).json({ success: true, data: populated });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await Payment.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Payment not found" });
  res.json({ success: true });
});

module.exports = router;
