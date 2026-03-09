const express = require("express");
const { z } = require("zod");
const ClassModel = require("../models/Class");
const ClassSchedule = require("../models/ClassSchedule");
const Enrollment = require("../models/Enrollment");
const Teacher = require("../models/Teacher");
const { authRequired, requireRoles } = require("../middleware/auth");
const { sendClassAssignmentEmail } = require("../utils/email");

const router = express.Router();

async function classDTO(c) {
  const schedules = await ClassSchedule.find({ classId: c._id, isActive: true });
  const enrollmentsCount = await Enrollment.countDocuments({ classId: c._id });
  return {
    id: c._id,
    subject: c.subjectId,
    teacher: c.teacherId,
    grade: c.grade,
    fee: c.fee,
    description: c.description,
    isActive: c.isActive,
    schedules,
    schedulesCount: schedules.length,
    enrollmentsCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// list classes (public)
router.get("/", async (req, res) => {
  const { grade, teacherId, subjectId, isActive } = req.query;

  const filter = {};
  if (grade) filter.grade = Number(grade);
  if (teacherId) filter.teacherId = teacherId;
  if (subjectId) filter.subjectId = subjectId;
  if (isActive !== undefined && isActive !== "") filter.isActive = String(isActive) === "true";
  else if (req.query.hasOwnProperty('isActive') && req.query.isActive === "") {
    // no filter for empty string
  }
  else filter.isActive = true;

  const docs = await ClassModel.find(filter)
    .populate("subjectId")
    .populate("teacherId")
    .sort({ createdAt: -1 });

  const data = [];
  for (const c of docs) data.push(await classDTO(c));
  res.json({ success: true, data });
});

// list my classes for teacher
router.get("/my", authRequired, requireRoles("teacher"), async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user.userId });
  if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found" });

  const docs = await ClassModel.find({ teacherId: teacher._id })
    .populate("subjectId")
    .populate("teacherId")
    .sort({ createdAt: -1 });

  const data = [];
  for (const c of docs) data.push(await classDTO(c));
  res.json({ success: true, data });
});

// create (admin/super_admin)
router.post("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    subjectId: z.string().min(1),
    teacherId: z.string().min(1),
    grade: z.number().int().refine((n) => [9, 10, 11].includes(n)),
    fee: z.number().nonnegative(),
    description: z.string().optional().default(""),
    isActive: z.boolean().optional().default(true),
  });
  const body = schema.parse(req.body);

  const existing = await ClassModel.findOne({ subjectId: body.subjectId, teacherId: body.teacherId, grade: body.grade });
  if (existing) return res.status(400).json({ success: false, error: "Class with same subject, teacher and grade already exist" });

  const doc = await ClassModel.create(body);
  const populated = await ClassModel.findById(doc._id).populate("subjectId").populate("teacherId");

  // Send assignment email to teacher
  if (populated.teacherId) {
    sendClassAssignmentEmail(populated.teacherId, populated).catch(console.error);
  }

  res.status(201).json({ success: true, data: await classDTO(populated) });
});

// update (admin/super_admin)
router.put("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    subjectId: z.string().min(1).optional(),
    teacherId: z.string().min(1).optional(),
    grade: z.number().int().optional(),
    fee: z.number().nonnegative().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  });
  const body = schema.parse(req.body);

  const currentClass = await ClassModel.findById(req.params.id);
  if (!currentClass) return res.status(404).json({ success: false, error: "Class not found" });

  const checkSubject = body.subjectId || currentClass.subjectId;
  const checkTeacher = body.teacherId || currentClass.teacherId;
  const checkGrade = body.grade !== undefined ? body.grade : currentClass.grade;

  if (body.subjectId || body.teacherId || body.grade !== undefined) {
    const existing = await ClassModel.findOne({ subjectId: checkSubject, teacherId: checkTeacher, grade: checkGrade, _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ success: false, error: "Class with same subject, teacher and grade already exist" });
  }

  const doc = await ClassModel.findByIdAndUpdate(req.params.id, body, { new: true })
    .populate("subjectId")
    .populate("teacherId");
  if (!doc) return res.status(404).json({ success: false, error: "Class not found" });

  // Send assignment email to teacher
  if (doc.teacherId) {
    sendClassAssignmentEmail(doc.teacherId, doc).catch(console.error);
  }

  res.json({ success: true, data: await classDTO(doc) });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await ClassModel.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Class not found" });
  await ClassSchedule.deleteMany({ classId: req.params.id });
  await Enrollment.deleteMany({ classId: req.params.id });
  res.json({ success: true });
});

module.exports = router;
