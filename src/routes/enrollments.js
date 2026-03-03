const express = require("express");
const { z } = require("zod");
const Enrollment = require("../models/Enrollment");
const ClassModel = require("../models/Class");
const { authRequired, requireRoles } = require("../middleware/auth");
const { getStudentByUser, getTeacherByUser } = require("../utils/currentProfile");
const { sendEnrollmentConfirmationEmail } = require("../utils/email");

const router = express.Router();

// list enrollments (admin/super_admin)
router.get("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const { studentId, classId } = req.query;
  const filter = {};
  if (studentId) filter.studentId = studentId;
  if (classId) filter.classId = classId;

  const docs = await Enrollment.find(filter)
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

// my enrollments (student)
router.get("/my", authRequired, requireRoles("student"), async (req, res) => {
  const student = await getStudentByUser(req.user.userId);
  if (!student) return res.status(404).json({ success: false, error: "Student profile not found" });

  const docs = await Enrollment.find({ studentId: student._id })
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

// teacher: see enrollments for my classes
router.get("/teacher/my-students", authRequired, requireRoles("teacher"), async (req, res) => {
  const teacher = await getTeacherByUser(req.user.userId);
  if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found" });

  const classes = await ClassModel.find({ teacherId: teacher._id }).select("_id");
  const classIds = classes.map(c => c._id);

  const docs = await Enrollment.find({ classId: { $in: classIds } })
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

// enroll (admin/super_admin)
router.post("/", authRequired, async (req, res) => {
  const schema = z.object({
    studentId: z.string().optional(),
    classId: z.string().min(1),
  });
  const body = schema.parse(req.body);

  let studentId = body.studentId;

  if (["super_admin", "admin"].includes(req.user.type)) {
    if (!studentId) return res.status(400).json({ success: false, error: "studentId is required" });
  } else if (req.user.type === "student") {
    const student = await getStudentByUser(req.user.userId);
    if (!student) return res.status(404).json({ success: false, error: "Student profile not found" });
    studentId = student._id.toString();
  } else {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  const existing = await Enrollment.findOne({ studentId, classId: body.classId });
  if (existing) return res.status(400).json({ success: false, error: "Student is already enrolled in this class" });

  const doc = await Enrollment.create({ studentId, classId: body.classId });

  const populated = await Enrollment.findById(doc._id)
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] });

  // Send enrollment confirmation email
  if (populated.studentId && populated.classId) {
    sendEnrollmentConfirmationEmail(populated.studentId, populated.classId).catch(console.error);
  }

  res.status(201).json({ success: true, data: populated });
});

// unenroll (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await Enrollment.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Enrollment not found" });
  res.json({ success: true });
});

module.exports = router;
