const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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
  return { id:u.id, name:u.name, email:u.email, role:u.role, classId:u.classId || null, avatar:u.avatar || null, balance:coinBalance(db,u.id) };
}

function seed() {
  const db = getDB();
  if (db.users.length) return;
  const admin = { id:id("usr"), name:"MAKTAB X Admin", email:"admin@maktabx.local", role:"ADMIN", passwordHash:null };
  const teacher = { id:id("usr"), name:"Dilnoza Karimova", email:"teacher@maktabx.local", role:"TEACHER", passwordHash:null };
  const student = { id:id("usr"), name:"Azizbek A.", email:"student@maktabx.local", role:"STUDENT", passwordHash:null };
  const parent = { id:id("usr"), name:"Azizbekning ota-onasi", email:"parent@maktabx.local", role:"PARENT", passwordHash:null };
  const run = async () => {
    admin.passwordHash = await hashPassword("Admin123!");
    teacher.passwordHash = await hashPassword("Teacher123!");
    student.passwordHash = await hashPassword("Student123!");
    parent.passwordHash = await hashPassword("Parent123!");
    db.users.push(admin, teacher, student, parent);
    const cls = { id:id("cls"), name:"10-A", grade:10, teacherId:teacher.id };
    db.classes.push(cls); student.classId = cls.id; teacher.classId = cls.id;
    db.subjects.push(
      {id:id("sub"), name:"Matematika", teacherId:teacher.id},
      {id:id("sub"), name:"Fizika", teacherId:teacher.id},
      {id:id("sub"), name:"Ingliz tili", teacherId:teacher.id},
      {id:id("sub"), name:"Informatika", teacherId:teacher.id}
    );
    db.profiles.push({id:id("pr"), userId:student.id, level:12, xp:850, streak:7});
    db.coinTransactions.push(
      {id:id("tx"), userId:student.id, amount:1250, type:"BONUS", reason:"Boshlang‘ich X Coin", createdAt:now()}
    );
    db.grades.push(
      {id:id("gr"), studentId:student.id, subjectId:db.subjects[0].id, teacherId:teacher.id, grade:5, comment:"A’lo", date:"2026-08-28"},
      {id:id("gr"), studentId:student.id, subjectId:db.subjects[1].id, teacherId:teacher.id, grade:4, comment:"Yaxshi", date:"2026-08-27"},
      {id:id("gr"), studentId:student.id, subjectId:db.subjects[2].id, teacherId:teacher.id, grade:5, comment:"A’lo", date:"2026-08-26"}
    );
    db.products.push(
      {id:id("prd"), name:"MAKTAB X Ryukzak", description:"Maktab logotipli ryukzak", price:500, stock:12, category:"Aksessuarlar", image:"/assets/shop/backpack.svg", active:true, featured:true},
      {id:id("prd"), name:"Daftar to‘plami", description:"Premium daftarlar", price:200, stock:45, category:"Maktab anjomlari", image:"/assets/shop/notebook.svg", active:true, featured:false},
      {id:id("prd"), name:"Ruchka to‘plami", description:"3 dona ruchka", price:150, stock:30, category:"Maktab anjomlari", image:"/assets/shop/pens.svg", active:true, featured:false},
      {id:id("prd"), name:"Sertifikat", description:"Maktabning rasmiy sertifikati", price:250, stock:20, category:"Sertifikatlar", image:"/assets/shop/certificate.svg", active:true, featured:true},
      {id:id("prd"), name:"Medal", description:"Yutuq medali", price:400, stock:15, category:"Mukofotlar", image:"/assets/shop/medal.svg", active:true, featured:false},
      {id:id("prd"), name:"Kubok", description:"G‘oliblar kubogi", price:800, stock:8, category:"Mukofotlar", image:"/assets/shop/trophy.svg", active:true, featured:true}
    );
    db.challenges.push(
      {id:id("ch"), title:"Kunlik bilim sinovi", description:"5 ta savolga javob bering", reward:50, target:5, progress:3, type:"daily", active:true},
      {id:id("ch"), title:"Kitobxon bo‘l", description:"Haftada 1 ta kitob o‘qing", reward:250, target:1, progress:0, type:"weekly", active:true}
    );
    db.achievements.push(
      {id:id("ach"), name:"Starter", icon:"⭐", description:"MAKTAB X dagi ilk qadam"},
      {id:id("ach"), name:"Kitobxon", icon:"📚", description:"Kitob o‘qishga qiziqish"},
      {id:id("ach"), name:"Challenge Master", icon:"🏆", description:"5 ta challenge yakunlandi"}
    );
    db.subscriptions.push({id:id("subx"), userId:student.id, plan:"PRO", status:"active", startedAt:now()});
    db.announcements.push({id:id("ann"), title:"Yangi challenge!", body:"Haftalik bilim challenge boshlandi.", audience:"STUDENT", createdAt:now()});
    save();
  };
  run().catch(console.error);
}

apiRouter.post("/auth/login", async (req,res) => {
  const db = getDB(); const {email,password}=req.body;
  const u=db.users.find(x=>x.email.toLowerCase()===String(email||"").toLowerCase());
  if(!u || !(await verifyPassword(password||"",u.passwordHash))) return res.status(401).json({error:"Email yoki parol noto‘g‘ri"});
  res.cookie("maktabx_session", sign(u), {httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*24*3600*1000});
  res.json({user:publicUser(u,db)});
});
apiRouter.post("/auth/logout",(req,res)=>{res.clearCookie("maktabx_session");res.json({ok:true});});
apiRouter.get("/auth/me",auth,(req,res)=>{const db=getDB();const u=currentUser(db,req);res.json({user:publicUser(u,db)});});

apiRouter.get("/dashboard",auth,(req,res)=>{
  const db=getDB(), u=currentUser(db,req);
  const grades=db.grades.filter(g=>g.studentId===u.id);
  const avg=grades.length?grades.reduce((s,g)=>s+g.grade,0)/grades.length:0;
  res.json({user:publicUser(u,db), stats:{balance:coinBalance(db,u.id),average:Number(avg.toFixed(1)),attendance:92,level:db.profiles.find(p=>p.userId===u.id)?.level||1,xp:db.profiles.find(p=>p.userId===u.id)?.xp||0}, recentGrades:grades.slice(-6).reverse(), challenges:db.challenges.filter(c=>c.active).slice(0,4), products:db.products.filter(p=>p.active).slice(0,6), announcements:db.announcements.slice(0,5)});
});

apiRouter.get("/grades",auth,(req,res)=>{
  const db=getDB(), u=currentUser(db,req);
  let rows=db.grades;
  if(req.user.role==="STUDENT") rows=rows.filter(g=>g.studentId===u.id);
  if(req.user.role==="PARENT") { const child=db.users.find(x=>x.role==="STUDENT"); rows=rows.filter(g=>g.studentId===child?.id); }
  if(req.query.studentId) rows=rows.filter(g=>g.studentId===req.query.studentId);
  res.json(rows.map(g=>({...g,subject:db.subjects.find(s=>s.id===g.subjectId)?.name||"Fan",student:db.users.find(s=>s.id===g.studentId)?.name||"O‘quvchi",teacher:db.users.find(t=>t.id===g.teacherId)?.name||""})));
});
apiRouter.post("/grades",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(), {studentId,subjectId,grade,comment,date}=req.body;
  const n=Number(grade);
  if(!studentId||!subjectId||!Number.isInteger(n)||n<1||n>10) return res.status(400).json({error:"Baho 1 dan 10 gacha bo‘lishi kerak"});
  if(req.user.role==="TEACHER" && db.grades.some(g=>g.teacherId===req.user.id && g.studentId===studentId && g.subjectId===subjectId && g.date===date)) return res.status(409).json({error:"Bu baho allaqachon mavjud"});
  const row={id:id("gr"),studentId,subjectId,teacherId:req.user.id,grade:n,comment:comment||"",date:date||now().slice(0,10)};
  mutate(d=>{d.grades.push(row);notify(d,studentId,"Yangi baho",`${n} baho qo‘yildi`,"grade");audit(d,req.user.id,"GRADE_CREATED",studentId,{grade:n});});
  res.json(row);
});

apiRouter.get("/attendance",auth,(req,res)=>{const db=getDB(), u=currentUser(db,req);let rows=db.attendance;if(req.user.role==="STUDENT")rows=rows.filter(x=>x.studentId===u.id);res.json(rows);});
apiRouter.post("/attendance",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{const {studentId,status,date}=req.body;if(!studentId||!["Present","Absent","Late","Excused"].includes(status))return res.status(400).json({error:"Noto‘g‘ri attendance"});const row={id:id("att"),studentId,status,date:date||now().slice(0,10),teacherId:req.user.id};mutate(d=>d.attendance.push(row));res.json(row);});

apiRouter.get("/homework",auth,(req,res)=>{const db=getDB();res.json(db.homework);});
apiRouter.post("/homework",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("hw"),...req.body,teacherId:req.user.id,status:"Pending",createdAt:now()};mutate(d=>d.homework.push(row));res.json(row);});

apiRouter.get("/coins",auth,(req,res)=>{const db=getDB(),u=currentUser(db,req);res.json({balance:coinBalance(db,u.id),transactions:db.coinTransactions.filter(x=>x.userId===u.id).slice().reverse()});});
apiRouter.post("/coins/reward",auth,roles("TEACHER","ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB(), {userId,amount,reason,type}=req.body; const n=Number(amount);
  if(!userId||!Number.isFinite(n)||n<=0||n>5000)return res.status(400).json({error:"Mukofot miqdori noto‘g‘ri"});
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

apiRouter.get("/challenges",auth,(req,res)=>res.json(getDB().challenges));
apiRouter.post("/challenges/:id/progress",auth,roles("STUDENT"),(req,res)=>{
  const db=getDB(),c=db.challenges.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:"Challenge topilmadi"});
  const p=db.challengeProgress.find(x=>x.challengeId===c.id&&x.userId===req.user.id)||{id:id("cp"),challengeId:c.id,userId:req.user.id,progress:0,completed:false};
  p.progress=Math.min(c.target,p.progress+Number(req.body.amount||1)); if(p.progress>=c.target&&!p.completed){p.completed=true;db.coinTransactions.push({id:id("tx"),userId:req.user.id,amount:c.reward,type:"CHALLENGE_REWARD",reason:c.title,createdAt:now()});notify(db,req.user.id,"Challenge yakunlandi",`+${c.reward} X Coin`,"achievement");}
  const idx=db.challengeProgress.findIndex(x=>x.id===p.id);if(idx<0)db.challengeProgress.push(p);else db.challengeProgress[idx]=p;save();res.json(p);
});

apiRouter.get("/leaderboard",auth,(req,res)=>{const db=getDB();res.json(db.users.filter(u=>u.role==="STUDENT").map(u=>({...publicUser(u,db),balance:coinBalance(db,u.id)})).sort((a,b)=>b.balance-a.balance));});
apiRouter.get("/achievements",auth,(req,res)=>{const db=getDB();res.json(db.achievements.map(a=>({...a,earned:db.userAchievements.some(x=>x.achievementId===a.id&&x.userId===req.user.id)})));});

apiRouter.get("/events",auth,(req,res)=>res.json(getDB().events));
apiRouter.post("/events",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("evt"),...req.body,createdAt:now()};mutate(d=>d.events.push(row));res.json(row);});
apiRouter.post("/events/:id/checkin",auth,roles("STUDENT"),(req,res)=>{const db=getDB();if(!db.events.some(e=>e.id===req.params.id))return res.status(404).json({error:"Event topilmadi"});if(db.eventAttendance.some(x=>x.eventId===req.params.id&&x.userId===req.user.id))return res.status(409).json({error:"Allaqachon qayd etilgan"});const row={id:id("ea"),eventId:req.params.id,userId:req.user.id,createdAt:now()};mutate(d=>d.eventAttendance.push(row));res.json(row);});

apiRouter.get("/announcements",auth,(req,res)=>res.json(getDB().announcements));
apiRouter.post("/announcements",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{const row={id:id("ann"),...req.body,createdAt:now()};mutate(d=>d.announcements.unshift(row));res.json(row);});
apiRouter.get("/notifications",auth,(req,res)=>{const db=getDB();res.json(db.notifications.filter(n=>n.userId===req.user.id));});
apiRouter.patch("/notifications/:id/read",auth,(req,res)=>{const db=getDB(),n=db.notifications.find(x=>x.id===req.params.id&&x.userId===req.user.id);if(!n)return res.status(404).json({error:"Topilmadi"});mutate(d=>n.read=true);res.json(n);});

apiRouter.get("/subscriptions",auth,(req,res)=>{const db=getDB();res.json(db.subscriptions.filter(x=>x.userId===req.user.id));});
apiRouter.post("/subscriptions/activate",auth,(req,res)=>{const plan=String(req.body.plan||"").toUpperCase();if(!["FREE","PRO","MAX"].includes(plan))return res.status(400).json({error:"Plan noto‘g‘ri"});const db=getDB();const row={id:id("subscription"),userId:req.user.id,plan,status:"active",startedAt:now()};mutate(d=>d.subscriptions.push(row));res.json(row);});

apiRouter.get("/activity",auth,(req,res)=>{const db=getDB();res.json(db.activitySessions.filter(x=>x.userId===req.user.id));});
apiRouter.post("/activity/start",auth,roles("STUDENT"),(req,res)=>{const row={id:id("sess"),userId:req.user.id,type:req.body.type||"Study",title:req.body.title||"Faollik sessiyasi",startedAt:now(),endedAt:null,minutes:0,coins:0,screenShare:false};mutate(d=>d.activitySessions.push(row));res.json(row);});
apiRouter.post("/activity/:id/finish",auth,roles("STUDENT"),(req,res)=>{const db=getDB(),s=db.activitySessions.find(x=>x.id===req.params.id&&x.userId===req.user.id);if(!s)return res.status(404).json({error:"Sessiya topilmadi"});const minutes=Math.max(0,Math.min(120,Number(req.body.minutes||0)));const coins=Math.min(50,Math.floor(minutes/10)*5);mutate(d=>{s.endedAt=now();s.minutes=minutes;s.coins=coins;if(coins)d.coinTransactions.push({id:id("tx"),userId:req.user.id,amount:coins,type:"ACTIVITY_REWARD",reason:`${s.title}: ${minutes} min`,createdAt:now()});});res.json(s);});

apiRouter.get("/admin/overview",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>{
  const db=getDB();const students=db.users.filter(u=>u.role==="STUDENT"),teachers=db.users.filter(u=>u.role==="TEACHER");
  res.json({counts:{students:students.length,teachers:teachers.length,classes:db.classes.length,products:db.products.length,purchases:db.purchases.length,coinsEarned:db.coinTransactions.filter(x=>x.amount>0).reduce((s,x)=>s+x.amount,0),coinsSpent:-db.coinTransactions.filter(x=>x.amount<0).reduce((s,x)=>s+x.amount,0)},users:db.users.map(u=>publicUser(u,db)),purchases:db.purchases.slice().reverse(),auditLogs:db.auditLogs.slice(0,50)});
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
apiRouter.post("/admin/users",auth,roles("ADMIN","SUPER_ADMIN"),async(req,res)=>{const db=getDB(),{name,email,password,role,classId}=req.body;if(!name||!email||!password||!["STUDENT","TEACHER","PARENT","ADMIN"].includes(role))return res.status(400).json({error:"Ma’lumotlar to‘liq emas"});if(db.users.some(u=>u.email===email))return res.status(409).json({error:"Email band"});const u={id:id("usr"),name,email,role,classId:classId||null,passwordHash:await hashPassword(password)};mutate(d=>{d.users.push(u);audit(d,req.user.id,"USER_CREATED",u.id,{role});});res.json(publicUser(u,db));});

apiRouter.get("/admin/classes",auth,roles("ADMIN","SUPER_ADMIN"),(req,res)=>res.json(getDB().classes));
apiRouter.get("/admin/subjects",auth,roles("ADMIN","SUPER_ADMIN","TEACHER"),(req,res)=>res.json(getDB().subjects));

apiRouter.post("/ai/chat",auth,async(req,res)=>{
  const message=String(req.body.message||"").trim();
  if(!message)return res.status(400).json({error:"Savol kiriting"});
  // Provider-neutral safe fallback. Connect an AI provider by setting AI_API_URL/AI_API_KEY.
  if(process.env.AI_API_URL && process.env.AI_API_KEY){
    try{
      const r=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.AI_API_KEY}`},body:JSON.stringify({messages:[{role:"system",content:"You are MAKTAB X AI, a safe educational assistant. Answer in Uzbek unless asked otherwise."},{role:"user",content:message}]} )});
      if(r.ok){const j=await r.json();const answer=j.choices?.[0]?.message?.content||j.output_text||"Javob olindi.";return res.json({answer});}
    }catch(e){console.error("AI provider error",e.message);}
  }
  res.json({answer:"Men MAKTAB X AI yordamchisiman. Savolingizni tushuntirishga yordam beraman. Masalan, matematika masalasini bosqichma-bosqich yuboring yoki dars mavzusini yozing."});
});

module.exports = { apiRouter, seed };
