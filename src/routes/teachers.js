const express = require("express");
const { z } = require("zod");
const Teacher = require("../models/Teacher");
const ClassModel = require("../models/Class");
const { authRequired, requireRoles } = require("../middleware/auth");
const { nextSeq } = require("../utils/sequence");
const { teacherDTO } = require("../utils/formatters");
const { sendTeacherRegistrationEmail } = require("../utils/email");

const router = express.Router();

// list (admin/super_admin/teacher/student/guest - read only)
router.get("/", async (req, res) => {
  const { q, gender, isActive } = req.query;
  const filter = {};
  if (gender) filter.gender = String(gender).toLowerCase();
  if (isActive !== undefined) filter.isActive = String(isActive) === "true";
  if (q) {
    const re = new RegExp(String(q), "i");
    filter.$or = [{ fName: re }, { lName: re }, { email: re }];
  }
  const docs = await Teacher.find(filter).sort({ teacherNo: 1 });
  const data = await Promise.all(docs.map(async (t) => {
    const classes = await ClassModel.find({ teacherId: t._id }).populate("subjectId");
    const classStrings = classes.map(c => `${c.subjectId?.subjectName || 'Unknown'} G${c.grade}`);
    return { ...teacherDTO(t), classes: classStrings };
  }));
  res.json({ success: true, data });
});

// get one (auth not required)
router.get("/:id", async (req, res) => {
  const t = await Teacher.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, error: "Teacher not found" });
  res.json({ success: true, data: teacherDTO(t) });
});

// create (admin/super_admin)
router.post("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    fName: z.string().min(1),
    lName: z.string().min(1),
    title: z.string().optional().default(""),
    email: z.string().email().transform((s) => s.toLowerCase()),
    phone: z.string().optional().default(""),
    gender: z.enum(["male", "female"]),
    dateOfBirth: z.string().optional(),
    joinedDate: z.string().optional(),
    isActive: z.boolean().optional().default(true),
  });
  const body = schema.parse(req.body);

  const existingEmail = await Teacher.findOne({ email: body.email });
  if (existingEmail) return res.status(400).json({ success: false, error: "Email already exist. Please enter another email" });

  if (body.phone) {
    const existingPhone = await Teacher.findOne({ phone: body.phone });
    if (existingPhone) return res.status(400).json({ success: false, error: "Phone number already exist. Please enter another phone number" });
  }

  const teacherNo = await nextSeq("teacherNo");

  const doc = await Teacher.create({
    ...body,
    teacherNo,
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    joinedDate: body.joinedDate ? new Date(body.joinedDate) : undefined,
  });

  // Send registration email
  sendTeacherRegistrationEmail(doc).catch(console.error);

  res.status(201).json({ success: true, data: teacherDTO(doc) });
});

// update (admin/super_admin)
router.put("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const schema = z.object({
    fName: z.string().min(1).optional(),
    lName: z.string().min(1).optional(),
    title: z.string().optional(),
    email: z.string().email().transform((s) => s.toLowerCase()).optional(),
    phone: z.string().optional(),
    gender: z.enum(["male", "female"]).optional(),
    dateOfBirth: z.string().nullable().optional(),
    joinedDate: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  });
  const body = schema.parse(req.body);

  if (body.email) {
    const existingEmail = await Teacher.findOne({ email: body.email, _id: { $ne: req.params.id } });
    if (existingEmail) return res.status(400).json({ success: false, error: "Email already exist. Please enter another email" });
  }

  if (body.phone) {
    const existingPhone = await Teacher.findOne({ phone: body.phone, _id: { $ne: req.params.id } });
    if (existingPhone) return res.status(400).json({ success: false, error: "Phone number already exist. Please enter another phone number" });
  }

  const update = { ...body };
  if (body.dateOfBirth !== undefined) update.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (body.joinedDate !== undefined) update.joinedDate = body.joinedDate ? new Date(body.joinedDate) : null;

  const doc = await Teacher.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!doc) return res.status(404).json({ success: false, error: "Teacher not found" });
  res.json({ success: true, data: teacherDTO(doc) });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await Teacher.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Teacher not found" });
  res.json({ success: true });
});

module.exports = router;
