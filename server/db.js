const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const dbFile = path.join(dataDir, "db.json");

const empty = {
  users: [], profiles: [], classes: [], subjects: [], grades: [], attendance: [],
  homework: [], coinTransactions: [], rewardRules: [], products: [], purchases: [],
  subscriptions: [], challenges: [], challengeProgress: [], achievements: [], userAchievements: [],
  events: [], eventAttendance: [], announcements: [], notifications: [], activitySessions: [],
  auditLogs: [], settings: { schoolName: "MAKTAB X", subtitle: "1 SCHOOL", coinName: "X Coin" }
};

let db;
let writing = false;

function ensureDB() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(__dirname, "..", "uploads", "products"), { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(empty, null, 2));
  db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function save() {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function getDB() { if (!db) ensureDB(); return db; }

function id(prefix="id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

function mutate(fn) {
  const result = fn(db);
  save();
  return result;
}

module.exports = { ensureDB, getDB, save, mutate, id };
