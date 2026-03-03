require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db");
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const ClassModel = require("../models/Class");
const ClassSchedule = require("../models/ClassSchedule");
const { nextSeq } = require("../utils/sequence");

async function run() {
  await connectDB(process.env.MONGO_URI);

  // Super admin
  const saEmail = "superadmin@demo.com";
  const exists = await User.findOne({ username: saEmail });
  if (!exists) {
    const passwordHash = await bcrypt.hash("SuperAdmin123", 10);
    await User.create({ username: saEmail, passwordHash, type: "super_admin" });
    console.log("✅ Seeded super admin:", saEmail, "password: SuperAdmin123");
  }

  // Teachers
  const tEmail = "teacher1@demo.com";
  let teacher = await Teacher.findOne({ email: tEmail });
  if (!teacher) {
    teacher = await Teacher.create({
      teacherNo: await nextSeq("teacherNo"),
      fName: "Nimal",
      lName: "Perera",
      title: "Mr",
      email: tEmail,
      phone: "+94xxxxxxxxx",
      gender: "male",
    });
    console.log("✅ Seeded teacher:", tEmail);
  }

  // Students
  const sEmail = "student1@demo.com";
  let student = await Student.findOne({ email: sEmail });
  if (!student) {
    student = await Student.create({
      studentNo: await nextSeq("studentNo"),
      fName: "Kavindi",
      lName: "Silva",
      title: "Ms",
      email: sEmail,
      phone: "+94xxxxxxxxx",
      grade: 10,
      gender: "female",
    });
    console.log("✅ Seeded student:", sEmail);
  }

  // Subject
  let subj = await Subject.findOne({ subjectName: "Mathematics" });
  if (!subj) {
    subj = await Subject.create({
      subjectCode: await nextSeq("subjectCode"),
      subjectName: "Mathematics",
      description: "G9-11 Maths",
    });
    console.log("✅ Seeded subject: Mathematics");
  }

  // Class
  let cls = await ClassModel.findOne({ teacherId: teacher._id, subjectId: subj._id, grade: 10 });
  if (!cls) {
    cls = await ClassModel.create({
      teacherId: teacher._id,
      subjectId: subj._id,
      grade: 10,
      fee: 2500,
      description: "Maths Grade 10",
    });
    console.log("✅ Seeded class");
  }

  // Schedule
  const schedExists = await ClassSchedule.findOne({ classId: cls._id, day: "saturday" });
  if (!schedExists) {
    await ClassSchedule.create({
      classId: cls._id,
      classroom: "A1",
      day: "saturday",
      startTime: "08:00",
      endTime: "10:00",
    });
    console.log("✅ Seeded schedule");
  }

  console.log("✅ Seed complete.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
