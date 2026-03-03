const express = require("express");
const { z } = require("zod");
const Score = require("../models/Score");
const { authRequired, requireRoles } = require("../middleware/auth");
const { getStudentByUser, getTeacherByUser } = require("../utils/currentProfile");
const ClassModel = require("../models/Class");

const router = express.Router();

// admin list
router.get("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const { studentId, subjectId, grade, term } = req.query;
  const filter = {};
  if (studentId) filter.studentId = studentId;
  if (subjectId) filter.subjectId = subjectId;
  if (grade) filter.grade = Number(grade);
  if (term) filter.term = Number(term);

  const docs = await Score.find(filter).populate("studentId").populate("subjectId").sort({ createdAt: -1 });
  res.json({ success: true, data: docs });
});

// student my scores
router.get("/my", authRequired, requireRoles("student"), async (req, res) => {
  const student = await getStudentByUser(req.user.userId);
  if (!student) return res.status(404).json({ success: false, error: "Student profile not found" });

  const docs = await Score.find({ studentId: student._id }).populate("subjectId").sort({ createdAt: -1 });
  res.json({ success: true, data: docs });
});

// teacher create/update score for their subject+grade (simple check: teacher teaches a class for that subject+grade)
router.post("/", authRequired, requireRoles("teacher", "super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    studentId: z.string().min(1),
    subjectId: z.string().min(1),
    grade: z.number().int().refine((n) => [9, 10, 11].includes(n)),
    term: z.number().int().refine((n) => [1, 2, 3].includes(n)),
    marks: z.number().min(0).max(100),
  });
  const body = schema.parse(req.body);

  if (req.user.type === "teacher") {
    const teacher = await getTeacherByUser(req.user.userId);
    if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found" });

    const teaches = await ClassModel.exists({ teacherId: teacher._id, subjectId: body.subjectId, grade: body.grade });
    if (!teaches) return res.status(403).json({ success: false, error: "You don't teach this subject/grade" });
  }

  const existing = await Score.findOne({ studentId: body.studentId, subjectId: body.subjectId, grade: body.grade, term: body.term });
  if (existing) return res.status(400).json({ success: false, error: "Score for this student, subject, grade, and term already exist" });

  const doc = await Score.create({
    studentId: body.studentId,
    subjectId: body.subjectId,
    grade: body.grade,
    term: body.term,
    marks: body.marks,
  });

  const populated = await Score.findById(doc._id).populate("studentId").populate("subjectId");
  res.status(201).json({ success: true, data: populated });
});

// GET scores grouped by subject for specific student
router.get("/student/:studentId", authRequired, async (req, res) => {
  const scores = await Score.find({ studentId: req.params.studentId })
    .populate("subjectId")
    .sort({ grade: 1, term: 1 });

  const grouped = {};
  scores.forEach(s => {
    const subjectName = s.subjectId?.subjectName || "Unknown Subject";
    if (!grouped[subjectName]) grouped[subjectName] = [];
    grouped[subjectName].push({
      id: s._id,
      grade: s.grade,
      term: s.term,
      marks: s.marks,
      createdAt: s.createdAt
    });
  });

  res.json({ success: true, data: grouped });
});

// update (admin/super_admin)
router.put("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    marks: z.number().min(0).max(100).optional(),
    grade: z.number().int().refine((n) => [9, 10, 11].includes(n)).optional(),
    term: z.number().int().refine((n) => [1, 2, 3].includes(n)).optional(),
  });
  const body = schema.parse(req.body);
  const doc = await Score.findByIdAndUpdate(req.params.id, body, { new: true }).populate("studentId").populate("subjectId");
  if (!doc) return res.status(404).json({ success: false, error: "Score record not found" });
  res.json({ success: true, data: doc });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await Score.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Score record not found" });
  res.json({ success: true });
});

module.exports = router;
