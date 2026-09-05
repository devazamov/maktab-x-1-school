const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const secret = () => process.env.JWT_SECRET || "dev-only-change-me";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, secret(), { expiresIn: "7d" });
}

function auth(req, res, next) {
  const token = req.cookies?.maktabx_session;
  if (!token) return res.status(401).json({ error: "Kirish talab qilinadi" });
  try {
    req.user = jwt.verify(token, secret());
    next();
  } catch {
    return res.status(401).json({ error: "Sessiya tugagan" });
  }
}

function roles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ error: "Ruxsat yo‘q" });
    next();
  };
}

module.exports = { hashPassword, verifyPassword, sign, auth, roles };
