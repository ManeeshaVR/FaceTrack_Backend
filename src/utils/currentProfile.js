const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

async function getStudentByUser(userId) {
  return Student.findOne({ userId });
}

async function getTeacherByUser(userId) {
  return Teacher.findOne({ userId });
}

module.exports = { getStudentByUser, getTeacherByUser };
