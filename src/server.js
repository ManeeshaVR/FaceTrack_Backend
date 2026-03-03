require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { connectDB } = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const teacherRoutes = require("./routes/teachers");
const subjectRoutes = require("./routes/subjects");
const classRoutes = require("./routes/classes");
const classScheduleRoutes = require("./routes/classSchedules");
const enrollmentRoutes = require("./routes/enrollments");
const paymentRoutes = require("./routes/payments");
const attendanceRoutes = require("./routes/attendance");
const scoreRoutes = require("./routes/scores");
const dashboardRoutes = require("./routes/dashboard");
const settingsRoutes = require("./routes/settings");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"], credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true, name: "facetrack-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/class-schedules", classScheduleRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/facetrack";

connectDB(MONGO_URI)
    .then(() => {
        app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
    })
    .catch((e) => {
        console.error("Failed to start server:", e);
        process.exit(1);
    });
