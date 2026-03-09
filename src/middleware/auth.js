const { verifyToken } = require("../utils/jwt");

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, error: "Missing or invalid Authorization header" });
  }
  try {
    const payload = verifyToken(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, error: "Invalid/expired token" });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!roles.includes(req.user.type)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    next();
  };
}

module.exports = { authRequired, requireRoles };
