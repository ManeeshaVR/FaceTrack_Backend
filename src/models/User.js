const mongoose = require("mongoose");

const USER_TYPES = ["super_admin", "admin", "teacher", "student", "guest"];

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    type: { type: String, enum: USER_TYPES, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
module.exports.USER_TYPES = USER_TYPES;
