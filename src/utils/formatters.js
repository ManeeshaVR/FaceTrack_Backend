const { formatCode } = require("./sequence");

function studentDTO(s) {
  return {
    id: s._id,
    studentNo: formatCode("STU", s.studentNo, 3),
    fName: s.fName,
    lName: s.lName,
    title: s.title,
    email: s.email,
    phone: s.phone,
    grade: s.grade,
    gender: s.gender,
    dateOfBirth: s.dateOfBirth,
    registeredDate: s.registeredDate,
    userId: s.userId,
    embeddingsCount: Array.isArray(s.embeddings) ? s.embeddings.length : 0,
    isActive: s.isActive,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function teacherDTO(t) {
  return {
    id: t._id,
    teacherNo: formatCode("TCH", t.teacherNo, 3),
    fName: t.fName,
    lName: t.lName,
    title: t.title,
    email: t.email,
    phone: t.phone,
    gender: t.gender,
    dateOfBirth: t.dateOfBirth,
    joinedDate: t.joinedDate,
    userId: t.userId,
    isActive: t.isActive,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function subjectDTO(x) {
  return {
    id: x._id,
    subjectCode: formatCode("SUB", x.subjectCode, 3),
    subjectName: x.subjectName,
    description: x.description,
    isActive: x.isActive,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}

module.exports = { studentDTO, teacherDTO, subjectDTO };
