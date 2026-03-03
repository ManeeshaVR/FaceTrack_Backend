const express = require("express");

const { connectDB } = require("./config/db");

const app = express();

app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => res.json({ ok: true, name: "facetrack-backend" }));

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
