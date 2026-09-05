const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const dataDir = path.join(__dirname, "..", "data");
const dbFile = path.join(dataDir, "db.json");
const STATE_TABLE = "maktabx_app_state";
const UPLOAD_BUCKET = "maktabx-uploads";

const empty = {
  users: [], profiles: [], classes: [], subjects: [], grades: [], attendance: [],
  homework: [], homeworkSubmissions: [], coinTransactions: [], rewardRules: [], products: [], purchases: [],
  subscriptions: [], challenges: [], challengeProgress: [], achievements: [], userAchievements: [],
  events: [], eventAttendance: [], announcements: [], notifications: [], activitySessions: [],
  timetable: [], canteenItems: [], canteenOrders: [],
  auditLogs: [], settings: { schoolName: "MAKTAB X", subtitle: "1 SCHOOL", coinName: "X Coin" }
};

let db;
let saveQueue = Promise.resolve();

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

async function ensureDB() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from(STATE_TABLE).select("data").eq("id", "main").maybeSingle();
      if (error) throw error;
      const loaded = data && data.data && typeof data.data === "object" ? data.data : {};
      db = { ...structuredClone(empty), ...loaded };
      console.log(Object.keys(loaded).length ? "MAKTAB X: ma'lumotlar bazasi Supabase'dan yuklandi" : "MAKTAB X: Supabase'da bo'sh baza topildi, yangidan boshlanmoqda");
      return;
    } catch (e) {
      console.error("Supabase ulanish xatosi, mahalliy faylga o'tilmoqda:", e.message);
    }
  }
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(__dirname, "..", "uploads", "products"), { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(empty, null, 2));
  db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function save() {
  if (supabase) {
    const snapshot = db;
    saveQueue = saveQueue
      .then(() => supabase.from(STATE_TABLE).update({ data: snapshot, updated_at: new Date().toISOString() }).eq("id", "main"))
      .then(({ error }) => { if (error) console.error("Supabase saqlash xatosi:", error.message); })
      .catch(e => console.error("Supabase saqlash xatosi:", e.message));
    return;
  }
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function getDB() { if (!db) throw new Error("DB not initialized — call ensureDB() first"); return db; }

function id(prefix="id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

function mutate(fn) {
  const result = fn(db);
  save();
  return result;
}

// Stores an uploaded file (multer memoryStorage buffer) in Supabase Storage when
// configured, otherwise writes it to local disk under uploads/products. Returns
// the public URL/path to store on the record.
async function saveUpload(file, subdir="products") {
  const ext = path.extname(file.originalname || "") || ".webp";
  const filename = `${id("up")}${ext}`;
  if (supabase) {
    const key = `${subdir}/${filename}`;
    const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(key, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(key);
    return data.publicUrl;
  }
  const dir = path.join(__dirname, "..", "uploads", subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/uploads/${subdir}/${filename}`;
}

module.exports = { ensureDB, getDB, save, mutate, id, supabase, saveUpload };
