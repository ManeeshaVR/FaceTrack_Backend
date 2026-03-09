const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const { signToken } = require("../utils/jwt");

const router = express.Router();

async function tokenResponse(user) {
  const payload = { userId: user._id.toString(), username: user.username, type: user.type, email: user.username };

  if (user.type === "admin" || user.type === "super_admin") {
    payload.fName = "System";
    payload.lName = "Admin";
    payload.gender = "male";
    payload.title = "Mr";
  } else if (user.type === "teacher") {
    const t = await Teacher.findOne({ userId: user._id });
    if (t) {
      payload.fName = t.fName;
      payload.lName = t.lName;
      payload.gender = t.gender;
      payload.title = t.title;
    }
  } else if (user.type === "student") {
    const s = await Student.findOne({ userId: user._id });
    if (s) {
      payload.fName = s.fName;
      payload.lName = s.lName;
      payload.gender = s.gender;
      payload.title = s.title;
    }
  }

  const token = signToken(payload, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || "7d");
  return {
    success: true,
    token,
    user: payload,
  };
}

// Create super admin without auth
router.post("/super-admin", async (req, res) => {
  const schema = z.object({
    username: z.string().email().transform((s) => s.toLowerCase()),
    password: z.string().min(6),
  });
  const { username, password } = schema.parse(req.body);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({ username, passwordHash, type: "super_admin" });
  res.status(201).json(await tokenResponse(user));
});

// Guest token
router.post("/guest", async (req, res) => {
  const user = await User.create({
    username: `guest_${Date.now()}@guest.local`,
    type: "guest",
    isActive: true,
  });
  res.status(201).json(await tokenResponse(user));
});

// Login (admin/teacher/student/super_admin)
router.post("/login", async (req, res) => {
  const schema = z.object({
    username: z.string().min(3).transform((s) => s.toLowerCase()),
    password: z.string().min(1),
  });
  const { username, password } = schema.parse(req.body);

  const user = await User.findOne({ username, isActive: true });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, error: "Invalid credentials" });

  res.json(await tokenResponse(user));
});

// Signup for teacher/student ONLY
router.post("/signup/:role", async (req, res) => {
  const role = (req.params.role || "").toLowerCase();
  if (!["teacher", "student"].includes(role)) {
    return res.status(400).json({ success: false, error: "Role must be teacher or student" });
  }

  const schema = z.object({
    username: z.string().email().transform((s) => s.toLowerCase()),
    password: z.string().min(6),
  });
  const { username, password } = schema.parse(req.body);

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(409).json({ success: false, error: "User already exists" });
  }

  // Validate pre-registered email
  if (role === "student") {
    const student = await Student.findOne({ email: username });
    if (!student) return res.status(403).json({ success: false, error: "Email not pre-registered as a student" });
    if (student.userId) return res.status(409).json({ success: false, error: "Student already has an account" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, type: "student" });
    student.userId = user._id;
    await student.save();
    return res.status(201).json(await tokenResponse(user));
  }

  if (role === "teacher") {
    const teacher = await Teacher.findOne({ email: username });
    if (!teacher) return res.status(403).json({ success: false, error: "Email not pre-registered as a teacher" });
    if (teacher.userId) return res.status(409).json({ success: false, error: "Teacher already has an account" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, type: "teacher" });
    teacher.userId = user._id;
    await teacher.save();
    return res.status(201).json(await tokenResponse(user));
  }
});

module.exports = router;
