const express = require("express");
const { z } = require("zod");
const Attendance = require("../models/Attendance");
const ClassSchedule = require("../models/ClassSchedule");
const ClassModel = require("../models/Class");
const { authRequired, requireRoles } = require("../middleware/auth");
const { getStudentByUser, getTeacherByUser } = require("../utils/currentProfile");

const router = express.Router();

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function timeHMS() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// admin list
router.get("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const { studentId, classId, classScheduleId, markedDate } = req.query;
  const filter = {};
  if (studentId) filter.studentId = studentId;
  if (classId) filter.classId = classId;
  if (classScheduleId) filter.classScheduleId = classScheduleId;
  if (markedDate) filter.markedDate = markedDate;

  const docs = await Attendance.find(filter)
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .populate("classScheduleId")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

// student my attendance
router.get("/my", authRequired, requireRoles("student"), async (req, res) => {
  const student = await getStudentByUser(req.user.userId);
  if (!student) return res.status(404).json({ success: false, error: "Student profile not found" });

  const docs = await Attendance.find({ studentId: student._id })
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .populate("classScheduleId")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

// teacher view attendance for my schedules
router.get("/teacher", authRequired, requireRoles("teacher"), async (req, res) => {
  const teacher = await getTeacherByUser(req.user.userId);
  if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found" });

  const { classScheduleId, markedDate } = req.query;

  // Validate schedule belongs to teacher
  const schedule = classScheduleId ? await ClassSchedule.findById(classScheduleId).populate("classId") : null;
  if (schedule) {
    const classDoc = await ClassModel.findById(schedule.classId._id);
    if (!classDoc || classDoc.teacherId.toString() !== teacher._id.toString()) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
  }

  const filter = {};
  if (classScheduleId) filter.classScheduleId = classScheduleId;
  if (markedDate) filter.markedDate = markedDate;

  // gather teacher's classIds
  const classes = await ClassModel.find({ teacherId: teacher._id }).select("_id");
  const classIds = classes.map(c => c._id);
  filter.classId = { $in: classIds };

  const docs = await Attendance.find(filter)
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .populate("classScheduleId")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

// mark attendance (teacher/admin)
router.post("/mark", authRequired, requireRoles("super_admin", "admin", "teacher"), async (req, res) => {
  const schema = z.object({
    studentId: z.string().min(1),
    classId: z.string().min(1),
    classScheduleId: z.string().min(1),
    status: z.enum(["absent", "present"]),
    method: z.enum(["manual", "face"]).optional().default("manual"),
    markedDate: z.string().optional(), // YYYY-MM-DD
    markedTime: z.string().optional(), // HH:mm:ss
  });
  const body = schema.parse(req.body);

  // If teacher, ensure schedule belongs to them
  if (req.user.type === "teacher") {
    const teacher = await getTeacherByUser(req.user.userId);
    if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found" });

    const classDoc = await ClassModel.findById(body.classId);
    if (!classDoc || classDoc.teacherId.toString() !== teacher._id.toString()) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
  }

  const markedDate = body.markedDate || todayISO();
  // Deduplicate by schedule slot, not just classId — a student could attend
  // two different schedule slots of the same class on the same day.
  const existing = await Attendance.findOne({ studentId: body.studentId, classScheduleId: body.classScheduleId, markedDate });
  if (existing) return res.status(400).json({ success: false, error: "Student already marked attendance for this schedule today" });

  const doc = await Attendance.create({
    studentId: body.studentId,
    classId: body.classId,
    classScheduleId: body.classScheduleId,
    status: body.status,
    method: body.method,
    markedDate,
    markedTime: body.markedTime || timeHMS(),
    markedByUserId: req.user.userId,
  });

  const populated = await Attendance.findById(doc._id)
    .populate("studentId")
    .populate({ path: "classId", populate: [{ path: "subjectId" }, { path: "teacherId" }] })
    .populate("classScheduleId");

  res.status(201).json({ success: true, data: populated });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/check  (admin / teacher / super_admin)
//
// Used by the ML face-recognition attendance system.
// Does NOT save any record – just runs all the business rules and returns a
// structured result so the frontend can display the correct UI.
//
// Body: { studentId: "<mongo _id>", classScheduleId: "<mongo _id>" }
//
// Response:
//   { success: true, data: { access, reason, student?, enrollment?, payment? } }
//
//   access:  "granted" | "denied"
//   reason:  "not_enrolled" | "payment_overdue" | "payment_pending_early" | "paid"
// ──────────────────────────────────────────────────────────────────────────────
const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");
const { formatCode } = require("../utils/sequence");

router.post("/check", authRequired, requireRoles("super_admin", "admin", "teacher"), async (req, res) => {
  const schema = z.object({
    studentId: z.string().min(1),
    classScheduleId: z.string().min(1),
  });
  const { studentId, classScheduleId } = schema.parse(req.body);

  // 1. Load student
  const student = await Student.findById(studentId);
  if (!student) return res.status(404).json({ success: false, error: "Student not found" });

  const studentInfo = {
    id: formatCode("STU", student.studentNo, 3),
    name: `${student.fName} ${student.lName}`,
    grade: student.grade,
    gender: student.gender,
  };

  // 2. Load schedule → resolve classId
  const schedule = await ClassSchedule.findById(classScheduleId)
    .populate({ path: "classId", populate: [{ path: "subjectId" }] });
  if (!schedule) return res.status(404).json({ success: false, error: "Class schedule not found" });

  const classId = schedule.classId._id;
  const subjectName = schedule.classId?.subjectId?.subjectName || "Unknown";

  // IDs the frontend needs to call POST /mark
  const ids = {
    studentMongoId: student._id.toString(),
    classMongoId: classId.toString(),
    classScheduleMongoId: classScheduleId,
  };

  // 3. Check enrollment first (needed by all subsequent responses)
  const enrollment = await Enrollment.findOne({ studentId: student._id, classId });
  const isEnrolled = !!(enrollment && enrollment.isActive);

  // 4. Already marked today? — include enrollment so UI shows the correct badge
  const todayStr = todayISO();
  const existing = await Attendance.findOne({ studentId: student._id, classScheduleId, markedDate: todayStr });
  if (existing) {
    return res.json({
      success: true,
      data: {
        access: "already_marked",
        reason: "already_marked",
        student: studentInfo,
        class: { name: subjectName, grade: schedule.classId.grade },
        enrollment: { status: isEnrolled ? "enrolled" : "not_enrolled" },
        ids,
      },
    });
  }

  // 5. Not enrolled → denied
  if (!isEnrolled) {
    return res.json({
      success: true,
      data: {
        access: "denied",
        reason: "not_enrolled",
        student: studentInfo,
        class: { name: subjectName, grade: schedule.classId.grade },
        ids,
      },
    });
  }

  // 5. Check payment for current month
  const now = new Date();
  const monthNames = ["january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"];
  const currentMonth = monthNames[now.getMonth()];
  const dayOfMonth = now.getDate();

  const payment = await Payment.findOne({ studentId: student._id, classId, month: currentMonth });
  const hasPaid = !!payment;

  // Before 15th — grace period
  if (!hasPaid && dayOfMonth < 15) {
    return res.json({
      success: true,
      data: {
        access: "granted",
        reason: "payment_pending_early",
        student: studentInfo,
        class: { name: subjectName, grade: schedule.classId.grade },
        enrollment: { status: "enrolled" },
        payment: { status: "pending", month: currentMonth },
        ids,
      },
    });
  }

  // After 15th, not paid → denied
  if (!hasPaid && dayOfMonth >= 15) {
    return res.json({
      success: true,
      data: {
        access: "denied",
        reason: "payment_overdue",
        student: studentInfo,
        class: { name: subjectName, grade: schedule.classId.grade },
        enrollment: { status: "enrolled" },
        payment: { status: "overdue", month: currentMonth },
        ids,
      },
    });
  }

  // Paid → granted
  return res.json({
    success: true,
    data: {
      access: "granted",
      reason: "paid",
      student: studentInfo,
      class: { name: subjectName, grade: schedule.classId.grade },
      enrollment: { status: "enrolled" },
      payment: { status: "paid", month: currentMonth, amount: payment.amount },
      ids,
    },
  });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
  const doc = await Attendance.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Attendance record not found" });
  res.json({ success: true });
});

module.exports = router;
