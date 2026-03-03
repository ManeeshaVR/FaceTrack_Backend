const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");

const router = express.Router();

// Mock in-memory settings for demo (could be replaced by a Settings model)
let globalSettings = {
    instituteName: "Dream Institute",
    instituteEmail: "info@dreaminstitute.com",
    institutePhone: "+1 (555) 123-4567",
    instituteAddress: "123 Education Street, Knowledge City, KC 12345",
    emailNotifications: true,
    smsNotifications: false,
    livenessDetection: true,
    autoBackup: true,
    sessionTimeout: "30",
    maxStudentsPerClass: "35",
};

// get settings
router.get("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
    res.json({ success: true, data: globalSettings });
});

// update settings
router.post("/", authRequired, requireRoles("super_admin", "admin"), async (req, res) => {
    globalSettings = { ...globalSettings, ...req.body };
    res.json({ success: true, data: globalSettings });
});

module.exports = router;
