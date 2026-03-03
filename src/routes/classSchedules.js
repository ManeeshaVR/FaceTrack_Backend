const express = require("express");
const { z } = require("zod");
const ClassSchedule = require("../models/ClassSchedule");
const ClassModel = require("../models/Class");
const Teacher = require("../models/Teacher");
const { authRequired, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, requireRoles("super_admin","admin","teacher","student"), async (req, res) => {
  const { classId } = req.query;
  const filter = {};
  if (classId) filter.classId = classId;

  const docs = await ClassSchedule.find(filter)
    .populate({
      path: "classId",
      populate: [{ path: "subjectId" }, { path: "teacherId" }],
    })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

router.get("/my", authRequired, requireRoles("teacher"), async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user.userId });
  if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found" });

  const classes = await ClassModel.find({ teacherId: teacher._id }).select("_id");
  const classIds = classes.map(c => c._id);

  const docs = await ClassSchedule.find({ classId: { $in: classIds } })
    .populate({
      path: "classId",
      populate: [{ path: "subjectId" }, { path: "teacherId" }],
    })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: docs });
});

// create (admin/super_admin)
router.post("/", authRequired, requireRoles("super_admin","admin"), async (req, res) => {
  const schema = z.object({
    classId: z.string().min(1),
    classroom: z.string().min(1),
    day: z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    isActive: z.boolean().optional().default(true),
  });
  const body = schema.parse(req.body);
  const doc = await ClassSchedule.create(body);
  const populated = await ClassSchedule.findById(doc._id).populate({
    path:"classId",
    populate:[{path:"subjectId"},{path:"teacherId"}]
  });
  res.status(201).json({ success: true, data: populated });
});

// update (admin/super_admin)
router.put("/:id", authRequired, requireRoles("super_admin","admin"), async (req, res) => {
  const schema = z.object({
    classId: z.string().min(1).optional(),
    classroom: z.string().min(1).optional(),
    day: z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]).optional(),
    startTime: z.string().min(1).optional(),
    endTime: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  });
  const body = schema.parse(req.body);
  const doc = await ClassSchedule.findByIdAndUpdate(req.params.id, body, { new: true }).populate({
    path:"classId",
    populate:[{path:"subjectId"},{path:"teacherId"}]
  });
  if (!doc) return res.status(404).json({ success: false, error: "Schedule not found" });
  res.json({ success: true, data: doc });
});

// delete (admin/super_admin)
router.delete("/:id", authRequired, requireRoles("super_admin","admin"), async (req, res) => {
  const doc = await ClassSchedule.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Schedule not found" });
  res.json({ success: true });
});

module.exports = router;
