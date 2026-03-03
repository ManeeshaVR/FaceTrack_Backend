const express = require("express");
const { z } = require("zod");
const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const { authRequired, requireRoles } = require("../middleware/auth");
const { nextSeq } = require("../utils/sequence");
const { studentDTO } = require("../utils/formatters");
const { sendStudentRegistrationEmail } = require("../utils/email");

const router = express.Router();

// list students (admin/super_admin/teacher - read only)
router.get("/", authRequired, requireRoles("super_admin", "admin", "teacher"), async (req, res) => {
  const { q, grade, gender, isActive } = req.query;

  const filter = {};
  if (grade) filter.grade = Number(grade);
  if (gender) filter.gender = String(gender).toLowerCase();
  if (isActive !== undefined) filter.isActive = String(isActive) === "true";
  if (q) {
    const re = new RegExp(String(q), "i");
    filter.$or = [{ fName: re }, { lName: re }, { email: re }];
  }

  const docs = await Student.find(filter).sort({ studentNo: 1 });
  const data = await Promise.all(docs.map(async (s) => {
    const enrollments = await Enrollment.find({ studentId: s._id })
      .populate({ path: "classId", populate: { path: "subjectId" } });
    const classStrings = enrollments.map(e => e.classId?.subjectId?.subjectName || "Unknown");
    // Ensure uniqueness using set
    const uniqueClasses = [...new Set(classStrings)];
    return { ...studentDTO(s), classes: uniqueClasses };
  }));
  res.json({ success: true, data });
});

// get one (admin/super_admin/teacher/student - self)
router.get("/:id", authRequired, async (req, res) => {
  const s = await Student.findById(req.params.id);
  if (!s) return res.status(404).json({ success: false, error: "Student not found" });

  if (["super_admin", "admin", "teacher"].includes(req.user.type)) {
    return res.json({ success: true, data: studentDTO(s), embeddings: s.embeddings });
  }

  if (req.user.type === "student") {
    if (s.userId && s.userId.toString() === req.user.userId) {
      return res.json({ success: true, data: studentDTO(s), embeddings: s.embeddings });
    }
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  return res.status(403).json({ success: false, error: "Forbidden" });
});

// create (admin/super_admin)
router.post("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    fName: z.string().min(1),
    lName: z.string().min(1),
    title: z.string().optional().default(""),
    email: z.string().email().transform((s) => s.toLowerCase()),
    phone: z.string().optional().default(""),
    grade: z.number().int().refine((n) => [9, 10, 11].includes(n)),
    gender: z.enum(["male", "female"]),
    dateOfBirth: z.string().optional(),
    registeredDate: z.string().optional(),
    isActive: z.boolean().optional().default(true),
  });

  const body = schema.parse(req.body);

  const existingEmail = await Student.findOne({ email: body.email });
  if (existingEmail) return res.status(400).json({ success: false, error: "Email already exist. Please enter another email" });

  if (body.phone) {
    const existingPhone = await Student.findOne({ phone: body.phone });
    if (existingPhone) return res.status(400).json({ success: false, error: "Phone number already exist. Please enter another phone number" });
  }

  const studentNo = await nextSeq("studentNo");

  const doc = await Student.create({
    ...body,
    studentNo,
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    registeredDate: body.registeredDate ? new Date(body.registeredDate) : undefined,
  });

  // Send registration email
  sendStudentRegistrationEmail(doc).catch(console.error);

  res.status(201).json({ success: true, data: studentDTO(doc) });
});

// update (admin/super_admin)
router.put("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    fName: z.string().min(1).optional(),
    lName: z.string().min(1).optional(),
    title: z.string().optional(),
    email: z.string().email().transform((s) => s.toLowerCase()).optional(),
    phone: z.string().optional(),
    grade: z.number().int().optional(),
    gender: z.enum(["male", "female"]).optional(),
    dateOfBirth: z.string().nullable().optional(),
    registeredDate: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  });

  const body = schema.parse(req.body);

  if (body.email) {
    const existingEmail = await Student.findOne({ email: body.email, _id: { $ne: req.params.id } });
    if (existingEmail) return res.status(400).json({ success: false, error: "Email already exist. Please enter another email" });
  }

  if (body.phone) {
    const existingPhone = await Student.findOne({ phone: body.phone, _id: { $ne: req.params.id } });
    if (existingPhone) return res.status(400).json({ success: false, error: "Phone number already exist. Please enter another phone number" });
  }

  const update = { ...body };
  if (body.dateOfBirth !== undefined) update.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (body.registeredDate !== undefined) update.registeredDate = body.registeredDate ? new Date(body.registeredDate) : null;

  const doc = await Student.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!doc) return res.status(404).json({ success: false, error: "Student not found" });
  res.json({ success: true, data: studentDTO(doc) });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await Student.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Student not found" });
  res.json({ success: true });
});

// embeddings (admin/super_admin)
router.put("/:id/embeddings", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    embeddings: z.array(z.array(z.number())).max(5),
  });
  const { embeddings } = schema.parse(req.body);

  const doc = await Student.findByIdAndUpdate(req.params.id, { embeddings }, { new: true });
  if (!doc) return res.status(404).json({ success: false, error: "Student not found" });
  res.json({ success: true, data: studentDTO(doc), embeddings: doc.embeddings });
});

module.exports = router;
