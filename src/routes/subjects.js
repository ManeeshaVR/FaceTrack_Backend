const express = require("express");
const { z } = require("zod");
const Subject = require("../models/Subject");
const { authRequired, requireRoles } = require("../middleware/auth");
const { nextSeq } = require("../utils/sequence");
const { subjectDTO } = require("../utils/formatters");
const Class = require("../models/Class");
const Enrollment = require("../models/Enrollment");

const router = express.Router();

// list (public)
router.get("/", async (req, res) => {
  const { q, isActive } = req.query;
  const filter = {};
  if (isActive !== undefined) filter.isActive = String(isActive) === "true";
  if (q) {
    const re = new RegExp(String(q), "i");
    filter.$or = [{ subjectName: re }];
  }
  const docs = await Subject.find(filter).sort({ subjectCode: 1 });
  const populatedDocs = await Promise.all(docs.map(async (doc) => {
    const subjectId = doc._id;
    const classes = await Class.find({ subjectId });
    const classIds = classes.map(c => c._id);
    const teacherIds = new Set(classes.map(c => c.teacherId.toString()));
    const enrollments = await Enrollment.find({ classId: { $in: classIds }, isActive: true });
    const studentIds = new Set(enrollments.map(e => e.studentId.toString()));
    const subjectData = subjectDTO(doc);
    subjectData.classesCount = classes.length;
    subjectData.teachersCount = teacherIds.size;
    subjectData.studentsCount = studentIds.size;
    return subjectData;
  }));
  res.json({ success: true, data: populatedDocs });
});

// create (admin/super_admin)
router.post("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    subjectName: z.string().min(1),
    description: z.string().optional().default(""),
    isActive: z.boolean().optional().default(true),
  });
  const body = schema.parse(req.body);

  const existing = await Subject.findOne({ subjectName: { $regex: new RegExp(`^${body.subjectName}$`, 'i') } });
  if (existing) return res.status(400).json({ success: false, error: "Subject name already exist" });

  const subjectCode = await nextSeq("subjectCode");
  const doc = await Subject.create({ ...body, subjectCode });
  res.status(201).json({ success: true, data: subjectDTO(doc) });
});

// update (admin/super_admin)
router.put("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    subjectName: z.string().min(1).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  });
  const body = schema.parse(req.body);

  if (body.subjectName) {
    const existing = await Subject.findOne({
      subjectName: { $regex: new RegExp(`^${body.subjectName}$`, 'i') },
      _id: { $ne: req.params.id }
    });
    if (existing) return res.status(400).json({ success: false, error: "Subject name already exist" });
  }

  const doc = await Subject.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!doc) return res.status(404).json({ success: false, error: "Subject not found" });
  res.json({ success: true, data: subjectDTO(doc) });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await Subject.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Subject not found" });
  res.json({ success: true });
});

module.exports = router;
