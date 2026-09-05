const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { getDB, mutate, id, save } = require("./db");
const { hashPassword, verifyPassword, sign, auth, roles } = require("./auth");

const apiRouter = express.Router();
const upload = multer({
  dest: path.join(__dirname, "..", "uploads", "products"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (/^image\/(png|jpeg|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Faqat rasm fayllari"));
  }
});

const ORDER_TTL_MS = 15 * 60 * 1000;
const ADMIN_CREATABLE_ROLES = ["STUDENT", "TEACHER", "PARENT", "ADMIN", "OSHPAZ"];

function now() { return new Date().toISOString(); }
function currentUser(db, req) { return db.users.find(u => u.id === req.user.id); }
function coinBalance(db, userId) {
  return db.coinTransactions.filter(x => x.userId === userId).reduce((s, x) => s + Number(x.amount || 0), 0);
}
function audit(db, actorId, action, target, metadata={}) {
  db.auditLogs.unshift({ id: id("audit"), actorId, action, target, metadata, createdAt: now() });
}
function notify(db, userId, title, body, type="system") {
  db.notifications.unshift({ id: id("notif"), userId, title, body, type, read: false, createdAt: now() });
}
function publicUser(u, db) {
  return { id:u.id, name:u.name, email:u.email, phone:u.phone||null, role:u.role, classId:u.classId || null, avatar:u.avatar || null, balance:coinBalance(db,u.id) };
}
function genPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "Ax7bQ9kLmZ2";
}

// First-run bootstrap: creates ONE super-admin account. No demo students, classes,
// coins, or products. Everything else is created by the admin from the admin panel.
function seed() {
  const db = getDB();
  if (db.users.length) return;
  const email = (process.env.ADMIN_EMAIL || "admin@maktabx.local").toLowerCase();
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || genPassword();
  const admin = { id:id("usr"), name: process.env.ADMIN_NAME || "Bosh administrator", email, phone: process.env.ADMIN_PHONE || null, role:"SUPER_ADMIN", passwordHash:null };
  (async () => {
    admin.passwordHash = await hashPassword(password);
    db.users.push(admin);
    save();
    console.log("============================================================");
    console.log(" MAKTAB X — birinchi marta ishga tushirildi");
    console.log(" Super admin email: " + email);
    if (generated) console.log(" Super admin parol (faqat shu safar ko'rsatiladi): " + password);
    else console.log(" Super admin parol: ADMIN_PASSWORD muhit o'zgaruvchisidan o'rnatildi");
    console.log(" Kirgach darhol parolni almashtiring (Profil > Parolni o'zgartirish).");
    console.log("============================================================");
  })().catch(console.error);
}

apiRouter.post("/auth/login", async (req,res) => {
  const db = getDB(); const {identifier,email,password}=req.body;
  const idf = String(identifier||email||"").trim().toLowerCase();
  const u=db.users.find(x=>(x.email&&x.email.toLowerCase()===idf)||(x.phone&&x.phone.toLowerCase()===idf));
  if(!u || !(await verifyPassword(password||"",u.passwordHash))) return res.status(401).json({error:"Login yoki parol noto‘g‘ri"});
  res.cookie("maktabx_session", sign(u), {httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*24*3600*1000});
  res.json({user:publicUser(u,db)});
});
apiRouter.post("/auth/logout",(req,res)=>{res.clearCookie("maktabx_session");res.json({ok:true});});
apiRouter.get("/auth/me",auth,(req,res)=>{const db=getDB();const u=currentUser(db,req);if(!u)return res.status(401).json({error:"Sessiya tugagan"});res.json({user:publicUser(u,db)});});
apiRouter.post("/auth/password",auth,async(req,res)=>{
  const db=getDB(),u=currentUser(db,req),{currentPassword,newPassword}=req.body;
  if(!(await verifyPassword(currentPassword||"",u.passwordHash)))return res.status(401).json({error:"Joriy parol noto‘g‘ri"});
  if(!newPassword||newPassword.length<6)return res.status(400).json({error:"Yangi parol kamida 6 belgi bo‘lsin"});
  const hash=await hashPassword(newPassword);
  mutate(d=>{const usr=d.users.find(x=>x.id===u.id);usr.passwordHash=hash;});
  res.json({ok:true});
});

apiRouter.get("/dashboard",auth,(req,res)=>{
  const db=getDB(), u=currentUser(db,req);
  const grades=db.grades.filter(g=>g.studentId===u.id);
  const avg=grades.length?grades.reduce((s,g)=>s+g.grade,0)/grades.length:0;
  const att=db.attendance.filter(a=>a.studentId===u.id);
  const attRate=att.length?Math.round(100*att.filter(a=>a.status==="Present").length/att.length):null;
  res.json({user:publicUser(u,db), stats:{balance:coinBalance(db,u.id),average:Number(avg.toFixed(1)),attendance:attRate,level:db.profiles.find(p=>p.userId===u.id)?.level||1,xp:db.profiles.find(p=>p.userId===u.id)?.xp||0}, recentGrades:grades.slice(-6).reverse(), challenges:db.challenges.filter(c=>c.active).slice(0,4), products:db.products.filter(p=>p.active).slice(0,6), announcements:db.announcements.slice(0,5), unreadNotifications:db.notifications.filter(n=>n.userId===u.id&&!n.read).length});
});

apiRouter.get("/grades",auth,(req,res)=>{
  const db=getDB(), u=currentUser(db,req);
  let rows=db.grades;
  if(req.user.role==="STUDENT") rows=rows.filter(g=>g.studentId===u.id);
  if(req.user.role==="PARENT" && u.childId) rows=rows.filter(g=>g.studentId===u.childId);
  if(req.query.studentId) rows=rows.filter(g=>g.studentId===req.query.studentId);
  res.json(rows.map(g=>({...g,subject:db.subjects.find(s=>s.id===g.subjectId)?.name||"Fan",student:db.users.find(s=>s.id===g.studentId)?.name||"O‘quvchi",teacher:db.users.find(t=>t.id===g.teacherId)?.name||""})));
});
apiRouter.post("/grades",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(), {studentId,subjectId,grade,comment,date}=req.body;
  const n=Number(grade);
  if(!studentId||!subjectId||!Number.isInteger(n)||n<1||n>10) return res.status(400).json({error:"Baho 1 dan 10 gacha bo‘lishi kerak"});
  if(!db.users.some(x=>x.id===studentId&&x.role==="STUDENT"))return res.status(404).json({error:"O‘quvchi topilmadi"});
  if(req.user.role==="TEACHER" && db.grades.some(g=>g.teacherId===req.user.id && g.studentId===studentId && g.subjectId===subjectId && g.date===date)) return res.status(409).json({error:"Bu baho allaqachon mavjud"});
  const row={id:id("gr"),studentId,subjectId,teacherId:req.user.id,grade:n,comment:comment||"",date:date||now().slice(0,10)};
  mutate(d=>{d.grades.push(row);notify(d,studentId,"Yangi baho",`${n} baho qo‘yildi`,"grade");audit(d,req.user.id,"GRADE_CREATED",studentId,{grade:n});});
  res.json(row);
});

apiRouter.get("/attendance",auth,(req,res)=>{const db=getDB(), u=currentUser(db,req);let rows=db.attendance;if(req.user.role==="STUDENT")rows=rows.filter(x=>x.studentId===u.id);if(req.query.classId)rows=rows.filter(x=>x.classId===req.query.classId);res.json(rows);});
apiRouter.post("/attendance",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{const {studentId,status,date,classId}=req.body;if(!studentId||!["Present","Absent","Late","Excused"].includes(status))return res.status(400).json({error:"Noto‘g‘ri attendance"});const row={id:id("att"),studentId,status,date:date||now().slice(0,10),classId:classId||null,teacherId:req.user.id};mutate(d=>d.attendance.push(row));res.json(row);});

apiRouter.get("/timetable",auth,(req,res)=>{
  const db=getDB(), u=currentUser(db,req);
  let rows=db.timetable;
  if(req.user.role==="STUDENT") rows=rows.filter(t=>t.classId===u.classId);
  else if(req.user.role==="TEACHER") rows=rows.filter(t=>t.teacherId===u.id);
  else if(req.query.classId) rows=rows.filter(t=>t.classId===req.query.classId);
  res.json(rows.map(t=>({...t,subject:db.subjects.find(s=>s.id===t.subjectId)?.name||"",teacher:db.users.find(x=>x.id===t.teacherId)?.name||"",class:db.classes.find(c=>c.id===t.classId)?.name||""})));
});
apiRouter.post("/timetable",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const {classId,subjectId,teacherId,day,time,room}=req.body;
  if(!classId||!subjectId||!day||!time)return res.status(400).json({error:"Ma’lumot to‘liq emas"});
  const row={id:id("tt"),classId,subjectId,teacherId:teacherId||null,day,time,room:room||""};
  mutate(d=>d.timetable.push(row));res.json(row);
});
apiRouter.delete("/timetable/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB();const idx=db.timetable.findIndex(x=>x.id===req.params.id);if(idx<0)return res.status(404).json({error:"Topilmadi"});mutate(d=>d.timetable.splice(idx,1));res.json({ok:true});});

apiRouter.get("/homework",auth,(req,res)=>{
  const db=getDB(),u=currentUser(db,req);
  let rows=db.homework;
  if(req.user.role==="STUDENT"&&u.classId) rows=rows.filter(h=>!h.classId||h.classId===u.classId);
  res.json(rows.map(h=>({...h,submitted:req.user.role==="STUDENT"?db.homeworkSubmissions.some(s=>s.homeworkId===h.id&&s.studentId===u.id):undefined})));
});
apiRouter.post("/homework",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("hw"),title:req.body.title,description:req.body.description||"",deadline:req.body.deadline||"",classId:req.body.classId||null,teacherId:req.user.id,status:"Pending",createdAt:now()};if(!row.title)return res.status(400).json({error:"Sarlavha kerak"});mutate(d=>d.homework.push(row));res.json(row);});
apiRouter.post("/homework/:id/submit",auth,roles("STUDENT"),(req,res)=>{
  const db=getDB();if(!db.homework.some(h=>h.id===req.params.id))return res.status(404).json({error:"Uy vazifasi topilmadi"});
  if(db.homeworkSubmissions.some(s=>s.homeworkId===req.params.id&&s.studentId===req.user.id))return res.status(409).json({error:"Allaqachon topshirilgan"});
  const row={id:id("hws"),homeworkId:req.params.id,studentId:req.user.id,comment:req.body.comment||"",submittedAt:now()};
  mutate(d=>{d.homeworkSubmissions.push(row);d.coinTransactions.push({id:id("tx"),userId:req.user.id,amount:10,type:"HOMEWORK_REWARD",reason:"Uy vazifasi topshirildi",createdAt:now()});});
  res.json(row);
});

apiRouter.get("/coins",auth,(req,res)=>{const db=getDB(),u=currentUser(db,req);res.json({balance:coinBalance(db,u.id),transactions:db.coinTransactions.filter(x=>x.userId===u.id).slice().reverse()});});
apiRouter.post("/coins/reward",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(), {userId,amount,reason,type}=req.body; const n=Number(amount);
  if(!userId||!Number.isFinite(n)||n<=0||n>5000)return res.status(400).json({error:"Mukofot miqdori noto‘g‘ri"});
  if(!db.users.some(x=>x.id===userId))return res.status(404).json({error:"Foydalanuvchi topilmadi"});
  const row={id:id("tx"),userId,amount:n,type:type||"ADMIN_REWARD",reason:reason||"O‘qituvchi mukofoti",createdAt:now()};
  mutate(d=>{d.coinTransactions.push(row);notify(d,userId,"X Coin olindi",`+${n} X Coin — ${row.reason}`,"coin");audit(d,req.user.id,"COIN_REWARD",userId,{amount:n});});
  res.json(row);
});

apiRouter.get("/shop/products",auth,(req,res)=>{const db=getDB();res.json(db.products.filter(p=>p.active));});
apiRouter.post("/shop/purchase",auth,roles("STUDENT","PARENT"),(req,res)=>{
  const db=getDB(),u=currentUser(db,req),p=db.products.find(x=>x.id===req.body.productId);
  if(!p||!p.active)return res.status(404).json({error:"Mahsulot topilmadi"});
  if(p.stock<1)return res.status(409).json({error:"Omborda qolmagan"});
  const balance=coinBalance(db,u.id);
  if(balance<p.price)return res.status(400).json({error:`X Coin yetarli emas. Sizda ${balance} bor`});
  const purchase={id:id("buy"),userId:u.id,items:[{productId:p.id,quantity:1,price:p.price}],total:p.price,status:"Pending",createdAt:now()};
  mutate(d=>{d.coinTransactions.push({id:id("tx"),userId:u.id,amount:-p.price,type:"SPEND",reason:`CoinShop: ${p.name}`,reference:purchase.id,createdAt:now()});p.stock--;d.purchases.push(purchase);notify(d,u.id,"Xarid qabul qilindi",p.name,"purchase");});
  res.json(purchase);
});
apiRouter.get("/purchases",auth,(req,res)=>{const db=getDB(),u=currentUser(db,req);let rows=db.purchases;if(req.user.role==="STUDENT"||req.user.role==="PARENT")rows=rows.filter(x=>x.userId===u.id);res.json(rows.map(x=>({...x,user:db.users.find(u=>u.id===x.userId)?.name,items:x.items.map(i=>({...i,product:db.products.find(p=>p.id===i.productId)?.name}))})));});
apiRouter.patch("/purchases/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB(),p=db.purchases.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"Topilmadi"});mutate(d=>{p.status=req.body.status||p.status;audit(d,req.user.id,"PURCHASE_STATUS",p.id,{status:p.status});});res.json(p);});

// ---------- Canteen (Oshxona) QR coin-exchange flow ----------
apiRouter.get("/canteen/items",auth,(req,res)=>{const db=getDB();res.json(db.canteenItems.filter(x=>x.active));});
apiRouter.get("/admin/canteen/items",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>res.json(getDB().canteenItems));
apiRouter.post("/admin/canteen/items",auth,roles("ADMIN","SUPER_ADMIN"),upload.single("image"),(req,res)=>{
  const it={id:id("cit"),name:req.body.name,description:req.body.description||"",price:Number(req.body.price||0),category:req.body.category||"Oshxona",active:req.body.active!=="false",image:""};
  if(!it.name||it.price<=0)return res.status(400).json({error:"Nomi va narxi to‘g‘ri kiritilsin"});
  if(req.file){const ext=path.extname(req.file.originalname)||".webp";const dest=req.file.path+ext;fs.renameSync(req.file.path,dest);it.image="/uploads/products/"+path.basename(dest);}
  mutate(d=>{d.canteenItems.push(it);audit(d,req.user.id,"CANTEEN_ITEM_CREATED",it.id,{name:it.name});});
  res.json(it);
});
apiRouter.patch("/admin/canteen/items/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(),it=db.canteenItems.find(x=>x.id===req.params.id);if(!it)return res.status(404).json({error:"Topilmadi"});
  const allowed=["name","description","price","category","active","image"];
  mutate(d=>{allowed.forEach(k=>{if(req.body[k]!==undefined)it[k]=(k==="price")?Number(req.body[k]):req.body[k];});});
  res.json(it);
});
apiRouter.delete("/admin/canteen/items/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB();const idx=db.canteenItems.findIndex(x=>x.id===req.params.id);if(idx<0)return res.status(404).json({error:"Topilmadi"});mutate(d=>d.canteenItems.splice(idx,1));res.json({ok:true});});

apiRouter.post("/canteen/orders",auth,roles("STUDENT"),async(req,res)=>{
  const db=getDB(),u=currentUser(db,req),it=db.canteenItems.find(x=>x.id===req.body.itemId&&x.active);
  if(!it)return res.status(404).json({error:"Mahsulot topilmadi"});
  const balance=coinBalance(db,u.id);
  if(balance<it.price)return res.status(400).json({error:`X Coin yetarli emas. Sizda ${balance} bor, kerak ${it.price}`});
  const openOrder=db.canteenOrders.find(o=>o.studentId===u.id&&o.status==="PENDING"&&new Date(o.expiresAt)>new Date());
  if(openOrder)return res.status(409).json({error:"Sizda tugallanmagan buyurtma bor",order:openOrder});
  const token=crypto.randomBytes(16).toString("hex");
  const qrImage=await QRCode.toDataURL(token,{width:280,margin:1});
  const order={id:id("cor"),studentId:u.id,itemId:it.id,itemName:it.name,price:it.price,qrToken:token,qrImage,status:"PENDING",chefId:null,failReason:null,createdAt:now(),expiresAt:new Date(Date.now()+ORDER_TTL_MS).toISOString(),completedAt:null};
  mutate(d=>d.canteenOrders.push(order));
  res.json(order);
});
apiRouter.get("/canteen/orders/mine",auth,roles("STUDENT"),(req,res)=>{const db=getDB();res.json(db.canteenOrders.filter(o=>o.studentId===req.user.id).slice().reverse());});
apiRouter.get("/canteen/orders/:id",auth,(req,res)=>{
  const db=getDB(),o=db.canteenOrders.find(x=>x.id===req.params.id);
  if(!o)return res.status(404).json({error:"Topilmadi"});
  if(o.studentId!==req.user.id&&!["OSHPAZ","ADMIN","SUPER_ADMIN"].includes(req.user.role))return res.status(403).json({error:"Ruxsat yo‘q"});
  res.json(o);
});
apiRouter.post("/canteen/orders/:id/cancel",auth,roles("STUDENT"),(req,res)=>{
  const db=getDB(),o=db.canteenOrders.find(x=>x.id===req.params.id&&x.studentId===req.user.id);
  if(!o)return res.status(404).json({error:"Topilmadi"});
  if(o.status!=="PENDING")return res.status(409).json({error:"Bu buyurtmani bekor qilib bo‘lmaydi"});
  mutate(()=>{o.status="CANCELLED";});
  res.json(o);
});

apiRouter.post("/canteen/redeem",auth,roles("OSHPAZ","ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(),token=String(req.body.token||"").trim();
  const o=db.canteenOrders.find(x=>x.qrToken===token);
  if(!o)return res.status(404).json({error:"QR kod topilmadi yoki noto‘g‘ri"});
  if(o.status!=="PENDING"){
    const msg={COMPLETED:"Bu QR kod allaqachon ishlatilgan",CANCELLED:"Bu buyurtma bekor qilingan",EXPIRED:"Bu QR kodning muddati o‘tgan",FAILED:"Bu buyurtma muvaffaqiyatsiz bo‘lgan"}[o.status]||"Bu buyurtma faol emas";
    return res.status(409).json({error:msg,status:o.status});
  }
  if(new Date(o.expiresAt)<new Date()){mutate(()=>{o.status="EXPIRED";});return res.status(409).json({error:"QR kodning muddati o‘tgan",status:"EXPIRED"});}
  const student=db.users.find(x=>x.id===o.studentId);
  const balance=coinBalance(db,o.studentId);
  if(balance<o.price){
    mutate(()=>{o.status="FAILED";o.failReason="Coin yetarli emas";});
    return res.status(400).json({error:`O‘quvchida X Coin yetarli emas (bor: ${balance}, kerak: ${o.price})`});
  }
  mutate(d=>{
    d.coinTransactions.push({id:id("tx"),userId:o.studentId,amount:-o.price,type:"CANTEEN_SPEND",reason:`Oshxona: ${o.itemName}`,reference:o.id,createdAt:now()});
    d.coinTransactions.push({id:id("tx"),userId:req.user.id,amount:o.price,type:"CANTEEN_EARN",reason:`Xizmat: ${o.itemName}`,reference:o.id,createdAt:now()});
    o.status="COMPLETED";o.chefId=req.user.id;o.completedAt=now();
    notify(d,o.studentId,"Buyurtma tayyor",`${o.itemName} — yoqimli ishtaha!`,"canteen");
    audit(d,req.user.id,"CANTEEN_REDEEMED",o.id,{item:o.itemName,price:o.price,studentId:o.studentId});
  });
  res.json({...o,studentName:student?.name||""});
});

apiRouter.get("/oshpaz/report",auth,roles("OSHPAZ"),(req,res)=>{
  const db=getDB();
  const mine=db.canteenOrders.filter(o=>o.chefId===req.user.id&&o.status==="COMPLETED").slice().reverse();
  const total=mine.reduce((s,o)=>s+o.price,0);
  const todayStr=now().slice(0,10);
  const today=mine.filter(o=>o.completedAt&&o.completedAt.slice(0,10)===todayStr).reduce((s,o)=>s+o.price,0);
  res.json({totalCoins:total,todayCoins:today,ordersCount:mine.length,orders:mine.map(o=>({...o,studentName:db.users.find(u=>u.id===o.studentId)?.name||""}))});
});

apiRouter.get("/admin/canteen/report",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB();
  const completed=db.canteenOrders.filter(o=>o.status==="COMPLETED");
  const byChef={};
  completed.forEach(o=>{byChef[o.chefId]=byChef[o.chefId]||{chefId:o.chefId,chefName:db.users.find(u=>u.id===o.chefId)?.name||"",totalCoins:0,ordersCount:0};byChef[o.chefId].totalCoins+=o.price;byChef[o.chefId].ordersCount++;});
  res.json({totalCoins:completed.reduce((s,o)=>s+o.price,0),ordersCount:completed.length,byChef:Object.values(byChef).sort((a,b)=>b.totalCoins-a.totalCoins),recentOrders:completed.slice().reverse().slice(0,50).map(o=>({...o,studentName:db.users.find(u=>u.id===o.studentId)?.name||"",chefName:db.users.find(u=>u.id===o.chefId)?.name||""}))});
});

apiRouter.get("/challenges",auth,(req,res)=>res.json(getDB().challenges));
apiRouter.post("/admin/challenges",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("ch"),title:req.body.title,description:req.body.description||"",reward:Number(req.body.reward||0),target:Number(req.body.target||1),progress:0,type:req.body.type||"daily",active:true};if(!row.title)return res.status(400).json({error:"Sarlavha kerak"});mutate(d=>d.challenges.push(row));res.json(row);});
apiRouter.post("/challenges/:id/progress",auth,roles("STUDENT"),(req,res)=>{
  const db=getDB(),c=db.challenges.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:"Challenge topilmadi"});
  const p=db.challengeProgress.find(x=>x.challengeId===c.id&&x.userId===req.user.id)||{id:id("cp"),challengeId:c.id,userId:req.user.id,progress:0,completed:false};
  p.progress=Math.min(c.target,p.progress+Number(req.body.amount||1)); if(p.progress>=c.target&&!p.completed){p.completed=true;db.coinTransactions.push({id:id("tx"),userId:req.user.id,amount:c.reward,type:"CHALLENGE_REWARD",reason:c.title,createdAt:now()});notify(db,req.user.id,"Challenge yakunlandi",`+${c.reward} X Coin`,"achievement");}
  const idx=db.challengeProgress.findIndex(x=>x.id===p.id);if(idx<0)db.challengeProgress.push(p);else db.challengeProgress[idx]=p;save();res.json(p);
});

apiRouter.get("/leaderboard",auth,(req,res)=>{const db=getDB();res.json(db.users.filter(u=>u.role==="STUDENT").map(u=>({...publicUser(u,db),balance:coinBalance(db,u.id),class:db.classes.find(c=>c.id===u.classId)?.name||""})).sort((a,b)=>b.balance-a.balance));});
apiRouter.get("/achievements",auth,(req,res)=>{const db=getDB();res.json(db.achievements.map(a=>({...a,earned:db.userAchievements.some(x=>x.achievementId===a.id&&x.userId===req.user.id)})));});

apiRouter.get("/events",auth,(req,res)=>res.json(getDB().events));
apiRouter.post("/events",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("evt"),title:req.body.title,description:req.body.description||"",date:req.body.date||"",location:req.body.location||"Maktab",createdAt:now()};if(!row.title)return res.status(400).json({error:"Sarlavha kerak"});mutate(d=>d.events.push(row));res.json(row);});
apiRouter.post("/events/:id/checkin",auth,roles("STUDENT"),(req,res)=>{const db=getDB();if(!db.events.some(e=>e.id===req.params.id))return res.status(404).json({error:"Event topilmadi"});if(db.eventAttendance.some(x=>x.eventId===req.params.id&&x.userId===req.user.id))return res.status(409).json({error:"Allaqachon qayd etilgan"});const row={id:id("ea"),eventId:req.params.id,userId:req.user.id,createdAt:now()};mutate(d=>d.eventAttendance.push(row));res.json(row);});

apiRouter.get("/announcements",auth,(req,res)=>res.json(getDB().announcements));
apiRouter.post("/announcements",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("ann"),title:req.body.title,body:req.body.body||"",audience:req.body.audience||"ALL",createdAt:now()};if(!row.title)return res.status(400).json({error:"Sarlavha kerak"});mutate(d=>d.announcements.unshift(row));res.json(row);});
apiRouter.get("/notifications",auth,(req,res)=>{const db=getDB();res.json(db.notifications.filter(n=>n.userId===req.user.id).slice(0,60));});
apiRouter.patch("/notifications/:id/read",auth,(req,res)=>{const db=getDB(),n=db.notifications.find(x=>x.id===req.params.id&&x.userId===req.user.id);if(!n)return res.status(404).json({error:"Topilmadi"});mutate(d=>n.read=true);res.json(n);});
apiRouter.post("/notifications/read-all",auth,(req,res)=>{mutate(d=>d.notifications.forEach(n=>{if(n.userId===req.user.id)n.read=true;}));res.json({ok:true});});

apiRouter.get("/subscriptions",auth,(req,res)=>{const db=getDB();res.json(db.subscriptions.filter(x=>x.userId===req.user.id));});
apiRouter.post("/subscriptions/activate",auth,(req,res)=>{const plan=String(req.body.plan||"").toUpperCase();if(!["FREE","PRO","MAX"].includes(plan))return res.status(400).json({error:"Plan noto‘g‘ri"});const db=getDB();const row={id:id("subscription"),userId:req.user.id,plan,status:"active",startedAt:now()};mutate(d=>d.subscriptions.push(row));res.json(row);});

apiRouter.get("/activity",auth,(req,res)=>{const db=getDB();res.json(db.activitySessions.filter(x=>x.userId===req.user.id));});
apiRouter.post("/activity/start",auth,roles("STUDENT"),(req,res)=>{const row={id:id("sess"),userId:req.user.id,type:req.body.type||"Study",title:req.body.title||"Faollik sessiyasi",startedAt:now(),endedAt:null,minutes:0,coins:0,screenShare:false};mutate(d=>d.activitySessions.push(row));res.json(row);});
apiRouter.post("/activity/:id/finish",auth,roles("STUDENT"),(req,res)=>{const db=getDB(),s=db.activitySessions.find(x=>x.id===req.params.id&&x.userId===req.user.id);if(!s)return res.status(404).json({error:"Sessiya topilmadi"});const minutes=Math.max(0,Math.min(120,Number(req.body.minutes||0)));const coins=Math.min(50,Math.floor(minutes/10)*5);mutate(d=>{s.endedAt=now();s.minutes=minutes;s.coins=coins;if(coins)d.coinTransactions.push({id:id("tx"),userId:req.user.id,amount:coins,type:"ACTIVITY_REWARD",reason:`${s.title}: ${minutes} min`,createdAt:now()});});res.json(s);});

apiRouter.get("/admin/overview",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB();const students=db.users.filter(u=>u.role==="STUDENT"),teachers=db.users.filter(u=>u.role==="TEACHER"),chefs=db.users.filter(u=>u.role==="OSHPAZ");
  res.json({counts:{students:students.length,teachers:teachers.length,chefs:chefs.length,classes:db.classes.length,products:db.products.length,purchases:db.purchases.length,coinsEarned:db.coinTransactions.filter(x=>x.amount>0).reduce((s,x)=>s+x.amount,0),coinsSpent:-db.coinTransactions.filter(x=>x.amount<0).reduce((s,x)=>s+x.amount,0)},users:db.users.map(u=>publicUser(u,db)),purchases:db.purchases.slice().reverse(),auditLogs:db.auditLogs.slice(0,50)});
});
apiRouter.get("/admin/products",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>res.json(getDB().products));
apiRouter.post("/admin/products",auth,roles("ADMIN","SUPER_ADMIN"),upload.single("image"),(req,res)=>{
  const p={id:id("prd"),name:req.body.name,description:req.body.description||"",price:Number(req.body.price||0),stock:Number(req.body.stock||0),category:req.body.category||"Boshqa",active:req.body.active!=="false",featured:req.body.featured==="true",image:""};
  if(!p.name||p.price<0||p.stock<0)return res.status(400).json({error:"Mahsulot ma’lumotlari noto‘g‘ri"});
  if(req.file){const ext=path.extname(req.file.originalname)||".webp";const dest=req.file.path+ext;fs.renameSync(req.file.path,dest);p.image="/uploads/products/"+path.basename(dest);}
  mutate(d=>{d.products.push(p);audit(d,req.user.id,"PRODUCT_CREATED",p.id,{name:p.name});});res.json(p);
});
apiRouter.patch("/admin/products/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(), p=db.products.find(x=>x.id===req.params.id);
  if(!p)return res.status(404).json({error:"Mahsulot topilmadi"});
  const allowed=["name","description","price","stock","category","active","featured","image"];
  mutate(d=>{
    allowed.forEach(k=>{ if(req.body[k]!==undefined) p[k]=(k==="price"||k==="stock")?Number(req.body[k]):req.body[k]; });
    audit(d,req.user.id,"PRODUCT_UPDATED",p.id,req.body);
  });
  res.json(p);
});
apiRouter.delete("/admin/products/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB();const idx=db.products.findIndex(x=>x.id===req.params.id);if(idx<0)return res.status(404).json({error:"Topilmadi"});mutate(d=>{const [p]=d.products.splice(idx,1);audit(d,req.user.id,"PRODUCT_DELETED",p.id);});res.json({ok:true});});

apiRouter.get("/admin/users",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB();res.json(db.users.map(u=>publicUser(u,db)));});
apiRouter.post("/admin/users",auth,roles("ADMIN","SUPER_ADMIN"),async(req,res)=>{
  const db=getDB(),{name,email,phone,password,role,classId}=req.body;
  if(!name||!password||!ADMIN_CREATABLE_ROLES.includes(role))return res.status(400).json({error:"Ma’lumotlar to‘liq emas"});
  if(!email&&!phone)return res.status(400).json({error:"Email yoki telefon kerak"});
  if(email&&db.users.some(u=>u.email&&u.email.toLowerCase()===String(email).toLowerCase()))return res.status(409).json({error:"Email band"});
  if(phone&&db.users.some(u=>u.phone===phone))return res.status(409).json({error:"Telefon raqam band"});
  const u={id:id("usr"),name,email:email||null,phone:phone||null,role,classId:classId||null,passwordHash:await hashPassword(password)};
  mutate(d=>{d.users.push(u);audit(d,req.user.id,"USER_CREATED",u.id,{role});});
  res.json(publicUser(u,db));
});
apiRouter.patch("/admin/users/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(),u=db.users.find(x=>x.id===req.params.id);
  if(!u)return res.status(404).json({error:"Topilmadi"});
  if(u.role==="SUPER_ADMIN"&&req.body.role&&req.body.role!=="SUPER_ADMIN")return res.status(403).json({error:"Super adminni o‘zgartirib bo‘lmaydi"});
  const allowed=["name","classId","phone"];
  if(req.body.role&&ADMIN_CREATABLE_ROLES.includes(req.body.role))allowed.push("role");
  mutate(d=>{allowed.forEach(k=>{if(req.body[k]!==undefined)u[k]=req.body[k];});audit(d,req.user.id,"USER_UPDATED",u.id,req.body);});
  res.json(publicUser(u,db));
});
apiRouter.delete("/admin/users/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(),u=db.users.find(x=>x.id===req.params.id);
  if(!u)return res.status(404).json({error:"Topilmadi"});
  if(u.role==="SUPER_ADMIN")return res.status(403).json({error:"Super adminni o‘chirib bo‘lmaydi"});
  if(u.id===req.user.id)return res.status(400).json({error:"O‘zingizni o‘chira olmaysiz"});
  mutate(d=>{d.users=d.users.filter(x=>x.id!==u.id);audit(d,req.user.id,"USER_DELETED",u.id,{name:u.name});});
  res.json({ok:true});
});
apiRouter.post("/admin/users/:id/reset-password",auth,roles("ADMIN","SUPER_ADMIN"),async(req,res)=>{
  const db=getDB(),u=db.users.find(x=>x.id===req.params.id);if(!u)return res.status(404).json({error:"Topilmadi"});
  const pw=genPassword();
  const hash=await hashPassword(pw);
  mutate(d=>{u.passwordHash=hash;audit(d,req.user.id,"PASSWORD_RESET",u.id,{});});
  res.json({password:pw});
});

apiRouter.get("/admin/classes",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>res.json(getDB().classes));
apiRouter.post("/admin/classes",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("cls"),name:req.body.name,grade:Number(req.body.grade||0),teacherId:req.body.teacherId||null};if(!row.name)return res.status(400).json({error:"Sinf nomi kerak"});mutate(d=>d.classes.push(row));res.json(row);});
apiRouter.patch("/admin/classes/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB(),c=db.classes.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:"Topilmadi"});mutate(d=>{if(req.body.name!==undefined)c.name=req.body.name;if(req.body.teacherId!==undefined)c.teacherId=req.body.teacherId;});res.json(c);});
apiRouter.delete("/admin/classes/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB();const idx=db.classes.findIndex(x=>x.id===req.params.id);if(idx<0)return res.status(404).json({error:"Topilmadi"});mutate(d=>d.classes.splice(idx,1));res.json({ok:true});});

apiRouter.get("/admin/subjects",auth,roles("ADMIN","SUPER_ADMIN","TEACHER"),(req,res)=>res.json(getDB().subjects));
apiRouter.post("/admin/subjects",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("sub"),name:req.body.name,teacherId:req.body.teacherId||null};if(!row.name)return res.status(400).json({error:"Fan nomi kerak"});mutate(d=>d.subjects.push(row));res.json(row);});
apiRouter.delete("/admin/subjects/:id",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const db=getDB();const idx=db.subjects.findIndex(x=>x.id===req.params.id);if(idx<0)return res.status(404).json({error:"Topilmadi"});mutate(d=>d.subjects.splice(idx,1));res.json({ok:true});});

apiRouter.post("/ai/chat",auth,async(req,res)=>{
  const message=String(req.body.message||"").trim();
  if(!message)return res.status(400).json({error:"Savol kiriting"});
  if(process.env.AI_API_URL && process.env.AI_API_KEY){
    try{
      const r=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.AI_API_KEY}`},body:JSON.stringify({messages:[{role:"system",content:"You are MAKTAB X AI, a safe educational assistant. Answer in Uzbek unless asked otherwise."},{role:"user",content:message}]} )});
      if(r.ok){const j=await r.json();const answer=j.choices?.[0]?.message?.content||j.output_text||"Javob olindi.";return res.json({answer});}
    }catch(e){console.error("AI provider error",e.message);}
  }
  res.json({answer:"Men MAKTAB X AI yordamchisiman. Savolingizni tushuntirishga yordam beraman. Masalan, matematika masalasini bosqichma-bosqich yuboring yoki dars mavzusini yozing."});
});

module.exports = { apiRouter, seed };
