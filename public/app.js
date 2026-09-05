const state={user:null,page:"home",dashboard:null,adminTab:"overview",scanning:false,scanStream:null,canteenPoll:null,qrScanning:false,qrScanStream:null};

const icons={home:"⌂",diary:"📅",grades:"★",homework:"✓",coin:"◉",shop:"🛍",canteen:"🍽",challenge:"🏆",leader:"🥇",events:"📅",ai:"✦",profile:"◉",admin:"▦",scan:"📷",report:"📊"};

async function api(url,opts={}){const r=await fetch("/api"+url,{credentials:"include",...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});let j={};try{j=await r.json()}catch{}if(!r.ok){const err=new Error(j.error||"Xatolik");err.data=j;throw err}return j}
function toast(s){const e=document.createElement("div");e.className="toast";e.textContent=s;document.getElementById("toast-root").append(e);setTimeout(()=>e.remove(),2600)}
function money(n){return new Intl.NumberFormat("uz-UZ").format(n)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function playWelcome(){try{const a=document.getElementById("welcomeAudio");if(a){a.currentTime=0;a.play().catch(()=>{});}}catch{}}

async function boot(){try{const m=await api("/auth/me");state.user=m.user;state.page=state.user.role==="OSHPAZ"?"scan":"home";await afterLogin();}catch{renderLogin()}}
async function afterLogin(){if(state.user.role!=="OSHPAZ")await loadDashboard();render()}
async function loadDashboard(){state.dashboard=await api("/dashboard")}

function renderLogin(){
 document.getElementById("app").innerHTML=`<main class="login"><section class="login-card"><div class="login-art"><img src="/assets/characters/x-boy.svg"></div><div class="login-form"><div class="logo"><img src="/assets/logo.svg"><div>MAKTAB X<small>1 SCHOOL</small></div></div><h1>Xush kelibsiz! 👋</h1><p class="muted">Hisobingizga kiring va bilim sari yangi qadam qo‘ying.</p><form id="loginForm"><div class="field"><label>Email yoki telefon</label><input id="identifier" required autocomplete="username"></div><div class="field"><label>Parol</label><input id="password" type="password" required autocomplete="current-password"></div><button class="primary" style="width:100%">Kirish</button></form></div></section></main>`;
 document.getElementById("loginForm").onsubmit=async e=>{e.preventDefault();try{const j=await api("/auth/login",{method:"POST",body:JSON.stringify({identifier:identifier.value,password:password.value})});state.user=j.user;state.page=state.user.role==="OSHPAZ"?"scan":"home";await afterLogin();playWelcome();toast("Xush kelibsiz!")}catch(e){toast(e.message)}}
}

function layout(content){
 const role=state.user.role;
 const admin=role==="ADMIN"||role==="SUPER_ADMIN";
 const nav=[["home","Bosh sahifa"],["diary","Kundalik"],["grades","Baholar"],["homework","Uy vazifalari"],["coin","X Coin"],["shop","CoinShop"]];
 if(role==="STUDENT")nav.push(["canteen","Oshxona"]);
 nav.push(["challenge","Challenge"],["leader","Leaderboard"],["events","Tadbirlar"],["ai","AI Assistant"],["profile","Profil"]);
 if(admin)nav.push(["admin","Admin panel"]);
 return `<div class="shell"><aside class="sidebar"><div class="brand"><div class="logo"><img src="/assets/logo.svg"><div>MAKTAB X<small>1 SCHOOL</small></div></div></div><nav class="nav">${nav.map(n=>`<button class="${state.page===n[0]?'active':''}" onclick="go('${n[0]}')">${icons[n[0]]} &nbsp;${n[1]}</button>`).join("")}</nav><div class="side-bottom"><button class="nav" style="width:100%;text-align:left;background:#f7f9fc;border:0;border-radius:16px;padding:12px" onclick="logout()">↪ Chiqish<br><small>${esc(state.user.email||state.user.phone||"")}</small></button></div></aside><main class="main"><header class="topbar"><input class="search" placeholder="Qidirish..."><div class="top-actions"><span class="coin-pill">🪙 ${money(state.user.balance)} X Coin</span><span class="bell-wrap"><span class="bell" onclick="toggleNotif()">🔔</span><span id="notifDrop"></span></span><div class="avatar">${esc(state.user.name[0])}</div></div></header><div class="content">${content}</div><div class="mobile-nav">${nav.slice(0,5).map(n=>`<button onclick="go('${n[0]}')"><b>${icons[n[0]]}</b>${n[1]}</button>`).join("")}</div></main></div>`;
}
function go(page){state.page=page;render()}
function render(){
 if(!state.user)return renderLogin();
 if(state.user.role==="OSHPAZ")return renderChefShell();
 const p=state.page;
 if(p==="home")return renderHome();
 if(p==="shop")return renderShop();
 if(p==="canteen")return renderCanteen();
 if(p==="grades")return renderGrades();
 if(p==="diary")return renderDiary();
 if(p==="challenge")return renderChallenges();
 if(p==="leader")return renderLeader();
 if(p==="events")return renderEvents();
 if(p==="ai")return renderAI();
 if(p==="homework")return renderHomework();
 if(p==="coin")return renderCoins();
 if(p==="admin")return renderAdmin();
 if(p==="profile")return renderProfile();
}
function setApp(c){document.getElementById("app").innerHTML=layout(c)}

// ---------- Notifications ----------
async function toggleNotif(){
 const drop=document.getElementById("notifDrop");
 if(drop.classList.contains("open")){drop.classList.remove("open");drop.innerHTML="";return}
 let rows=[];try{rows=await api("/notifications")}catch(e){return toast(e.message)}
 drop.classList.add("open");
 drop.innerHTML=`<div class="notif-panel"><div class="notif-head"><b>Bildirishnomalar</b><button class="ghost" onclick="markAllRead()">Barchasini o‘qish</button></div>${rows.length?rows.slice(0,15).map(n=>`<div class="notif-item ${n.read?'':'unread'}" onclick="readNotif('${n.id}')"><b>${esc(n.title)}</b><div class="muted" style="font-size:12px">${esc(n.body)}</div></div>`).join(""):'<p class="muted" style="padding:14px">Bildirishnoma yo‘q</p>'}</div>`;
}
async function readNotif(id){try{await api(`/notifications/${id}/read`,{method:"PATCH"})}catch{}}
async function markAllRead(){try{await api("/notifications/read-all",{method:"POST"});toggleNotif();toggleNotif();}catch(e){toast(e.message)}}

async function renderHome(){
 const d=state.dashboard; const avg=d.stats.average;
 setApp(`<div class="welcome"><div><h1>Salom, ${esc(state.user.name.split(" ")[0])}! 👋</h1><p class="muted">Bugun yangi bilimlar sari yana bir qadam.</p></div><button class="primary" onclick="go('shop')">CoinShop →</button></div>
 <section class="hero"><div><span class="badge green">MAKTAB X</span><h2 style="font-size:24px;margin-top:14px">Bilim ol, challenge bajar,<br>X Coin bilan mukofotlan!</h2><p class="muted">Faolligingiz va yutuqlaringiz shu yerda.</p><button class="primary" onclick="go('challenge')">Challenge ko‘rish</button></div><img src="/assets/characters/x-boy.svg"></section>
 <div class="grid4"><div class="card stat"><span class="label">X Coin balans</span><div class="value">🪙 ${money(d.stats.balance)}</div></div><div class="card stat"><span class="label">O‘rtacha baho</span><div class="value">${avg}</div></div><div class="card stat"><span class="label">Davomat</span><div class="value">${d.stats.attendance==null?"—":d.stats.attendance+"%"}</div></div><div class="card stat"><span class="label">Level</span><div class="value">${d.stats.level}</div><span class="hint">${d.stats.xp} XP</span></div></div>
 <div class="section-title"><h2>Tezkor bo‘limlar</h2></div><div class="quick">${[["diary","📅","Kundalik"],["grades","⭐","Baholar"],["homework","📚","Uy vazifalari"],["coin","🪙","X Coin"],["shop","🛍","CoinShop"],state.user.role==="STUDENT"?["canteen","🍽","Oshxona"]:["challenge","🎯","Challenge"],["ai","🤖","AI"]].map(x=>`<button onclick="go('${x[0]}')"><span class="ico">${x[1]}</span><span>${x[2]}</span></button>`).join("")}</div>
 <div class="grid2"><div><div class="section-title"><h2>Bugungi vazifangiz</h2></div><div class="card list">${d.challenges.length?d.challenges.map(c=>`<div class="list-item"><div class="rowflex"><div class="iconbox">🏆</div><div><b>${esc(c.title)}</b><div class="muted" style="font-size:12px">${esc(c.description)}</div></div></div><span class="badge gold">+${c.reward}</span></div>`).join(""):'<p class="muted">Hozircha challenge yo‘q</p>'}</div></div><div><div class="section-title"><h2>E’lonlar</h2></div><div class="card list">${d.announcements.length?d.announcements.map(a=>`<div class="list-item"><div><b>${esc(a.title)}</b><div class="muted" style="font-size:12px">${esc(a.body)}</div></div></div>`).join(""):'<p class="muted">E’lon yo‘q</p>'}</div></div></div>`);
}

async function renderShop(){
 let products=[];try{products=await api("/shop/products")}catch(e){return toast(e.message)}
 setApp(`<div class="welcome"><div><h1>CoinShop</h1><p class="muted">X Coinlaringizni foydali mukofotlarga almashtiring.</p></div><span class="coin-pill">🪙 ${money(state.user.balance)} X Coin</span></div><div class="section-title"><h2>Mahsulotlar</h2><span class="badge">${products.length} ta</span></div><div class="product-grid">${products.length?products.map(p=>`<div class="card product"><img src="${p.image||'/assets/shop/notebook.svg'}"><h3>${esc(p.name)}</h3><p class="muted" style="font-size:12px">${esc(p.description)}</p><div class="row"><span class="price">🪙 ${money(p.price)}</span><button class="primary" onclick="buy('${p.id}')">Sotib olish</button></div><small class="muted">Omborda: ${p.stock}</small></div>`).join(""):'<p class="muted">Hozircha mahsulot yo‘q. Admin panel orqali qo‘shiladi.</p>'}</div>`);
}
async function buy(id){try{await api("/shop/purchase",{method:"POST",body:JSON.stringify({productId:id})});await loadDashboard();state.user.balance=state.dashboard.user.balance;render();toast("Xarid muvaffaqiyatli!")}catch(e){toast(e.message)}}

// ---------- Oshxona (Canteen QR) ----------
async function renderCanteen(){
 let items=[];try{items=await api("/canteen/items")}catch(e){return toast(e.message)}
 setApp(`<div class="welcome"><div><h1>Oshxona 🍽</h1><p class="muted">Ovqat tanlang, X Coin bilan to‘lang, oshpazga QR ko‘rsating.</p></div><span class="coin-pill">🪙 ${money(state.user.balance)} X Coin</span></div><div class="product-grid" style="margin-top:20px">${items.length?items.map(it=>`<div class="card product"><img src="${it.image||'/assets/shop/notebook.svg'}"><h3>${esc(it.name)}</h3><p class="muted" style="font-size:12px">${esc(it.description||"")}</p><div class="row"><span class="price">🪙 ${money(it.price)}</span><button class="primary" onclick="orderCanteen('${it.id}')">Almashtirish</button></div></div>`).join(""):'<p class="muted">Hozircha oshxona menyusi bo‘sh. Admin panel orqali taom qo‘shiladi.</p>'}</div>`);
}
async function orderCanteen(itemId){
 try{
  const o=await api("/canteen/orders",{method:"POST",body:JSON.stringify({itemId})});
  openCanteenModal(o);
 }catch(e){
  if(e.data&&e.data.order){openCanteenModal(e.data.order);toast("Tugallanmagan buyurtmangiz bor")}
  else toast(e.message);
 }
}
function openCanteenModal(order){
 stopCanteenPoll();
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="canteenModal"><div class="modal" style="max-width:380px;text-align:center"><div class="modal-head"><h2>${esc(order.itemName)}</h2><button class="ghost" onclick="closeCanteenModal()">✕</button></div><div id="canteenBody"></div></div></div>`);
 renderCanteenState(order);
 if(order.status==="PENDING")state.canteenPoll=setInterval(()=>pollCanteenOrder(order.id),3000);
}
function renderCanteenState(o){
 const body=document.getElementById("canteenBody");if(!body)return;
 if(o.status==="PENDING"){
  body.innerHTML=`<img src="${o.qrImage}" style="width:220px;height:220px;margin:10px auto;display:block"><p class="price" style="font-size:20px">🪙 ${money(o.price)}</p><p class="muted" style="font-size:13px">Bu QR kodni oshxonadagi oshpazga ko‘rsating. U skanerlagach coin yechiladi.</p><button class="danger" style="width:100%" onclick="cancelCanteen('${o.id}')">Bekor qilish</button>`;
 }else if(o.status==="COMPLETED"){
  stopCanteenPoll();
  body.innerHTML=`<div style="font-size:52px;margin:14px 0">✅</div><h3>Tayyor! Yoqimli ishtaha 😋</h3><p class="muted">${money(o.price)} X Coin yechildi.</p><button class="primary" style="width:100%" onclick="closeCanteenModal(true)">Yopish</button>`;
 }else{
  stopCanteenPoll();
  const label={CANCELLED:"Bekor qilindi",EXPIRED:"Muddati o‘tdi",FAILED:o.failReason||"Muvaffaqiyatsiz"}[o.status]||o.status;
  body.innerHTML=`<div style="font-size:52px;margin:14px 0">⚠️</div><h3>${esc(label)}</h3><button class="secondary" style="width:100%" onclick="closeCanteenModal()">Yopish</button>`;
 }
}
async function pollCanteenOrder(orderId){
 try{const o=await api(`/canteen/orders/${orderId}`);renderCanteenState(o);if(o.status!=="PENDING"){await loadDashboard();state.user.balance=state.dashboard.user.balance;const pill=document.querySelector(".coin-pill");if(pill)pill.textContent=`🪙 ${money(state.user.balance)} X Coin`;}}catch{}
}
async function cancelCanteen(orderId){try{const o=await api(`/canteen/orders/${orderId}/cancel`,{method:"POST"});renderCanteenState(o)}catch(e){toast(e.message)}}
function stopCanteenPoll(){if(state.canteenPoll){clearInterval(state.canteenPoll);state.canteenPoll=null}}
function closeCanteenModal(refresh){stopCanteenPoll();document.getElementById("canteenModal")?.remove();if(refresh)render();}

async function renderDiary(){
 let rows=[];try{rows=await api("/timetable")}catch(e){return toast(e.message)}
 const days=["Dush","Sesh","Chor","Pay","Jum","Shan"];
 setApp(`<div class="welcome"><div><h1>Kundalik 📅</h1><p class="muted">Dars jadvalingiz.</p></div></div><div class="card" style="margin-top:20px">${rows.length?`<table><thead><tr><th>Kun</th><th>Vaqt</th><th>Fan</th><th>O‘qituvchi</th><th>Xona</th></tr></thead><tbody>${rows.sort((a,b)=>days.indexOf(a.day)-days.indexOf(b.day)||a.time.localeCompare(b.time)).map(t=>`<tr><td><b>${esc(t.day)}</b></td><td>${esc(t.time)}</td><td>${esc(t.subject)}</td><td>${esc(t.teacher)}</td><td>${esc(t.room||"—")}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">Dars jadvali hali kiritilmagan. Admin panel orqali qo‘shiladi.</p>'}</div>`);
}

async function renderGrades(){
 const rows=await api("/grades");setApp(`<div class="welcome"><div><h1>Baholar</h1><p class="muted">Barcha fanlar bo‘yicha 1–10 baholar.</p></div>${["TEACHER","ADMIN","SUPER_ADMIN"].includes(state.user.role)?'<button class="primary" onclick="gradeModal()">+ Baho qo‘shish</button>':""}</div><div class="card" style="margin-top:20px">${rows.length?`<table><thead><tr><th>Sana</th><th>Fan</th><th>O‘quvchi</th><th>Baho</th><th>Izoh</th></tr></thead><tbody>${rows.map(g=>`<tr><td>${g.date}</td><td><b>${esc(g.subject)}</b></td><td>${esc(g.student)}</td><td><span class="badge ${g.grade>=9?'green':g.grade>=6?'gold':'red'}">${g.grade}</span></td><td>${esc(g.comment)}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">Hozircha baho yo‘q</p>'}</div>`);
}
function gradeModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Baho qo‘shish</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>O‘quvchi ID</label><input id="gs"></div><div class="field"><label>Fan ID</label><input id="gsub"></div><div class="field"><label>Baho (1–10)</label><input id="gg" type="number" min="1" max="10"></div><div class="field"><label>Izoh</label><input id="gc"></div><button class="primary" onclick="addGrade()">Saqlash</button></div></div>`)}
async function addGrade(){try{await api("/grades",{method:"POST",body:JSON.stringify({studentId:gs.value,subjectId:gsub.value,grade:gg.value,comment:gc.value})});modal.remove();render();toast("Baho saqlandi")}catch(e){toast(e.message)}}

async function renderChallenges(){const cs=await api("/challenges");setApp(`<div class="welcome"><div><h1>Challenge</h1><p class="muted">Har kuni o‘zingizni sinang va X Coin yuting.</p></div>${["ADMIN","SUPER_ADMIN"].includes(state.user.role)?'<button class="primary" onclick="challengeModal()">+ Challenge qo‘shish</button>':""}</div><div class="grid2">${cs.length?cs.map(c=>`<div class="card"><div class="rowflex"><div class="iconbox">🏆</div><div><h3>${esc(c.title)}</h3><p class="muted">${esc(c.description)}</p></div></div><div style="margin:18px 0"><div class="progress"><i style="width:${(c.progress||0)/c.target*100}%"></i></div><small class="muted">${c.progress||0}/${c.target}</small></div><div class="row"><span class="price">+${c.reward} X Coin</span>${state.user.role==="STUDENT"?`<button class="primary" onclick="progressChallenge('${c.id}')">Davom etish</button>`:""}</div></div>`).join(""):'<p class="muted">Hozircha challenge yo‘q</p>'}</div>`)}
function challengeModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Challenge qo‘shish</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>Sarlavha</label><input id="cht"></div><div class="field"><label>Tavsif</label><input id="chd"></div><div class="grid2"><div class="field"><label>Mukofot (X Coin)</label><input id="chr" type="number"></div><div class="field"><label>Maqsad (son)</label><input id="chg" type="number" value="1"></div></div><button class="primary" onclick="addChallenge()">Saqlash</button></div></div>`)}
async function addChallenge(){try{await api("/admin/challenges",{method:"POST",body:JSON.stringify({title:cht.value,description:chd.value,reward:chr.value,target:chg.value})});modal.remove();render();toast("Challenge qo‘shildi")}catch(e){toast(e.message)}}
async function progressChallenge(id){try{await api(`/challenges/${id}/progress`,{method:"POST",body:JSON.stringify({amount:1})});await loadDashboard();state.user.balance=state.dashboard.user.balance;render();toast("Challenge progress yangilandi")}catch(e){toast(e.message)}}

async function renderLeader(){const rows=await api("/leaderboard");setApp(`<div class="welcome"><div><h1>Leaderboard 🥇</h1><p class="muted">X Coin bo‘yicha eng faol o‘quvchilar.</p></div></div><div class="card" style="margin-top:20px">${rows.length?`<table><thead><tr><th>#</th><th>O‘quvchi</th><th>Sinf</th><th>X Coin</th></tr></thead><tbody>${rows.map((u,i)=>`<tr><td><b>${i+1}</b></td><td><div class="rowflex"><div class="avatar">${esc(u.name[0])}</div><b>${esc(u.name)}</b></div></td><td>${esc(u.class||"—")}</td><td>🪙 ${money(u.balance)}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">Hali o‘quvchi yo‘q</p>'}</div>`)}

async function renderEvents(){const es=await api("/events");const staff=["TEACHER","ADMIN","SUPER_ADMIN"].includes(state.user.role);setApp(`<div class="welcome"><div><h1>Tadbirlar</h1><p class="muted">Maktab tadbirlari va QR orqali qatnashuv.</p></div>${["ADMIN","SUPER_ADMIN"].includes(state.user.role)?'<button class="primary" onclick="eventModal()">+ Tadbir qo‘shish</button>':""}</div><div class="grid3" style="margin-top:20px">${es.length?es.map(e=>`<div class="card"><div class="iconbox">📅</div><h3 style="margin-top:14px">${esc(e.title)}</h3><p class="muted">${esc(e.description||"")}</p><p>📍 ${esc(e.location||"Maktab")}</p><p>🗓 ${esc(e.date||"")}</p>${state.user.role==="STUDENT"?`<button class="primary" onclick="checkin('${e.id}')">QR orqali qatnashish</button>`:""}${staff?`<button class="secondary" onclick="openQrScanner('Tadbirga qatnashuv',t=>checkinScan('${e.id}',t))">📷 QR skaner</button>`:""}</div>`).join(""):'<p class="muted">Hozircha tadbir yo‘q</p>'}</div>`)}
function eventModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Tadbir qo‘shish</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>Sarlavha</label><input id="evt"></div><div class="field"><label>Tavsif</label><input id="evd"></div><div class="grid2"><div class="field"><label>Sana</label><input id="evdt" type="date"></div><div class="field"><label>Manzil</label><input id="evl" value="Maktab"></div></div><button class="primary" onclick="addEvent()">Saqlash</button></div></div>`)}
async function addEvent(){try{await api("/events",{method:"POST",body:JSON.stringify({title:evt.value,description:evd.value,date:evdt.value,location:evl.value})});modal.remove();render();toast("Tadbir qo‘shildi")}catch(e){toast(e.message)}}
async function checkin(id){try{await api(`/events/${id}/checkin`,{method:"POST"});toast("Tadbirga qatnashuv qayd etildi")}catch(e){toast(e.message)}}
async function checkinScan(eventId,token){try{const r=await api(`/events/${eventId}/checkin-scan`,{method:"POST",body:JSON.stringify({token})});toast(`${r.studentName} qatnashuvi qayd etildi ✅`)}catch(e){toast(e.message)}}

// ---------- Generic QR scanner (events check-in, etc.) ----------
function openQrScanner(title,onDecode){
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="qrScanModal"><div class="modal" style="max-width:380px;text-align:center"><div class="modal-head"><h2>${esc(title)}</h2><button class="ghost" onclick="closeQrScanner()">✕</button></div><video id="qrScanVideo" playsinline muted style="width:100%;border-radius:16px;background:#000;max-height:280px;object-fit:cover"></video><canvas id="qrScanCanvas" style="display:none"></canvas><p class="muted" id="qrScanHint" style="margin-top:10px">Kamera ishga tushmoqda...</p></div></div>`);
 ensureJsQR(()=>{
  navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(stream=>{
   state.qrScanStream=stream;state.qrScanning=true;
   const v=document.getElementById("qrScanVideo");if(!v)return;
   v.srcObject=stream;v.play();
   const hint=document.getElementById("qrScanHint");if(hint)hint.textContent="QR kodni ko‘rsating";
   const tick=()=>{
    if(!state.qrScanning)return;
    const video=document.getElementById("qrScanVideo");
    if(video&&video.readyState===video.HAVE_ENOUGH_DATA&&video.videoWidth){
     const canvas=document.getElementById("qrScanCanvas");
     canvas.width=video.videoWidth;canvas.height=video.videoHeight;
     const ctx=canvas.getContext("2d");ctx.drawImage(video,0,0,canvas.width,canvas.height);
     const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
     const code=window.jsQR(imgData.data,imgData.width,imgData.height,{inversionAttempts:"dontInvert"});
     if(code&&code.data){closeQrScanner();onDecode(code.data);return;}
    }
    requestAnimationFrame(tick);
   };
   requestAnimationFrame(tick);
  }).catch(()=>{const hint=document.getElementById("qrScanHint");if(hint)hint.textContent="Kameraga ruxsat berilmadi";});
 });
}
function closeQrScanner(){state.qrScanning=false;if(state.qrScanStream){state.qrScanStream.getTracks().forEach(t=>t.stop());state.qrScanStream=null;}document.getElementById("qrScanModal")?.remove();}

async function renderAI(){setApp(`<div class="welcome"><div><h1>MAKTAB X AI 🤖</h1><p class="muted">Darslarni tushunish, savollar va mashqlar uchun yordamchi.</p></div></div><div class="card" style="max-width:900px;margin-top:20px"><div id="chat" class="list" style="min-height:300px"><div class="list-item"><div class="rowflex"><div class="iconbox">✦</div><div><b>X AI</b><div class="muted">Salom! Qaysi mavzuni tushuntirib beray?</div></div></div></div></div><form id="aiform" style="display:flex;gap:10px;margin-top:16px"><input id="aimsg" class="field" style="margin:0;flex:1;padding:14px" placeholder="Savolingizni yozing..."><button class="primary">Yuborish</button></form></div>`);aiform.onsubmit=async e=>{e.preventDefault();const m=aimsg.value.trim();if(!m)return;chat.insertAdjacentHTML("beforeend",`<div class="list-item"><b>Siz:</b> ${esc(m)}</div>`);aimsg.value="";try{const j=await api("/ai/chat",{method:"POST",body:JSON.stringify({message:m})});chat.insertAdjacentHTML("beforeend",`<div class="list-item"><div class="rowflex"><div class="iconbox">✦</div><div><b>X AI</b><div>${esc(j.answer)}</div></div></div></div>`)}catch(e){toast(e.message)}}}

async function renderHomework(){const hs=await api("/homework");setApp(`<div class="welcome"><div><h1>Uy vazifalari</h1><p class="muted">Topshiriqlar, deadline va topshirish.</p></div>${["TEACHER","ADMIN","SUPER_ADMIN"].includes(state.user.role)?'<button class="primary" onclick="homeworkModal()">+ Vazifa qo‘shish</button>':""}</div><div class="grid2" style="margin-top:20px">${hs.length?hs.map(h=>`<div class="card"><span class="badge gold">Topshiriq</span><h3 style="margin-top:12px">${esc(h.title)}</h3><p class="muted">${esc(h.description||"")}</p><p>⏰ ${esc(h.deadline||"—")}</p>${state.user.role==="STUDENT"?(h.submitted?'<span class="badge green">Topshirildi ✓</span>':`<button class="secondary" onclick="submitHomework('${h.id}')">Topshirish</button>`):""}</div>`).join(""):'<p class="muted">Hozircha uy vazifasi yo‘q</p>'}</div>`)}
function homeworkModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Vazifa qo‘shish</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>Sarlavha</label><input id="hwt"></div><div class="field"><label>Tavsif</label><input id="hwd"></div><div class="field"><label>Muddat</label><input id="hwdl" placeholder="Masalan: Ertaga soat 09:00"></div><button class="primary" onclick="addHomework()">Saqlash</button></div></div>`)}
async function addHomework(){try{await api("/homework",{method:"POST",body:JSON.stringify({title:hwt.value,description:hwd.value,deadline:hwdl.value})});modal.remove();render();toast("Vazifa qo‘shildi")}catch(e){toast(e.message)}}
async function submitHomework(id){try{await api(`/homework/${id}/submit`,{method:"POST"});render();toast("Topshirildi! +10 X Coin")}catch(e){toast(e.message)}}

async function renderCoins(){const c=await api("/coins");setApp(`<div class="welcome"><div><h1>X Coin 🪙</h1><p class="muted">Topgan va sarflagan X Coinlaringiz tarixi.</p></div><span class="coin-pill">🪙 ${money(c.balance)}</span></div><div class="card" style="margin-top:20px">${c.transactions.length?`<table><thead><tr><th>Sana</th><th>Sabab</th><th>Turi</th><th>Miqdor</th></tr></thead><tbody>${c.transactions.map(x=>`<tr><td>${new Date(x.createdAt).toLocaleString("uz-UZ")}</td><td>${esc(x.reason)}</td><td>${esc(x.type)}</td><td class="${x.amount>0?'green-text':''}">${x.amount>0?"+":""}${money(x.amount)}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">Hali tranzaksiya yo‘q</p>'}</div>`)}

// ---------- Profile ----------
async function renderProfile(){
 setApp(`<div class="welcome"><div><h1>Profil</h1><p class="muted">Shaxsiy hisob ma’lumotlari.</p></div></div><div class="grid2" style="margin-top:20px;align-items:start"><div class="card"><div class="rowflex"><div class="avatar" style="width:70px;height:70px;font-size:28px">${esc(state.user.name[0])}</div><div><h2>${esc(state.user.name)}</h2><p class="muted">${esc(state.user.email||state.user.phone||"")}</p><span class="badge">${state.user.role}</span></div></div><hr style="border:0;border-top:1px solid var(--line);margin:22px 0"><p><b>X Coin:</b> ${money(state.user.balance)}</p><h3 style="margin-top:24px">Parolni o‘zgartirish</h3><div class="field"><label>Joriy parol</label><input id="curPw" type="password"></div><div class="field"><label>Yangi parol</label><input id="newPw" type="password"></div><button class="secondary" onclick="changePassword()">Saqlash</button><div style="margin-top:20px"><button class="danger" onclick="logout()">Chiqish</button></div></div><div class="card" style="text-align:center"><h3>Shaxsiy QR kod</h3><p class="muted" style="font-size:13px">Tadbirlarga qatnashuvni belgilash uchun shu QR kodni ko‘rsating.</p><div id="profileQr" style="margin-top:14px">Yuklanmoqda...</div></div></div>`);
 try{const r=await api("/profile/qr");const el=document.getElementById("profileQr");if(el)el.innerHTML=`<img src="${r.qrImage}" style="width:200px;height:200px">`;}catch(e){const el=document.getElementById("profileQr");if(el)el.innerHTML=`<p class="muted">QR yuklanmadi</p>`;}
}
async function changePassword(){try{await api("/auth/password",{method:"POST",body:JSON.stringify({currentPassword:curPw.value,newPassword:newPw.value})});curPw.value="";newPw.value="";toast("Parol yangilandi")}catch(e){toast(e.message)}}

// ---------- Admin ----------
async function renderAdmin(){
 if(!["ADMIN","SUPER_ADMIN"].includes(state.user.role))return go("home");
 const tabs=[["overview","Umumiy"],["users","Foydalanuvchilar"],["classes","Sinf/Fan"],["canteen","Oshxona"],["products","CoinShop"]];
 const tabBar=`<div class="admin-tabs">${tabs.map(t=>`<button class="${state.adminTab===t[0]?'active':''}" onclick="setAdminTab('${t[0]}')">${t[1]}</button>`).join("")}</div>`;
 setApp(`<div class="welcome"><div><h1>Admin boshqaruv paneli</h1><p class="muted">MAKTAB X platformasining barcha asosiy ko‘rsatkichlari.</p></div></div>${tabBar}<div id="adminBody" style="margin-top:20px"></div>`);
 renderAdminTab();
}
function setAdminTab(t){state.adminTab=t;renderAdmin();}
async function renderAdminTab(){
 const body=document.getElementById("adminBody");if(!body)return;
 if(state.adminTab==="overview")return renderAdminOverview(body);
 if(state.adminTab==="users")return renderAdminUsers(body);
 if(state.adminTab==="classes")return renderAdminClasses(body);
 if(state.adminTab==="canteen")return renderAdminCanteen(body);
 if(state.adminTab==="products")return renderAdminProducts(body);
}
async function renderAdminOverview(body){
 const d=await api("/admin/overview");
 body.innerHTML=`<div class="admin-kpis">${Object.entries(d.counts).map(([k,v])=>`<div class="mini"><small class="muted">${label(k)}</small><b>${money(v)}</b></div>`).join("")}</div><div class="grid2" style="margin-top:18px"><div class="card"><div class="section-title"><h2>So‘nggi xaridlar</h2></div>${d.purchases.slice(0,6).map(p=>`<div class="list-item"><div><b>${esc(p.user||"")}</b><div class="muted">${p.items?.length||0} mahsulot · ${p.total} X Coin</div></div><span class="badge gold">${p.status}</span></div>`).join("")||"<p class='muted'>Xaridlar yo‘q</p>"}</div><div class="card"><div class="section-title"><h2>So‘nggi harakatlar</h2></div>${d.auditLogs.slice(0,8).map(a=>`<div class="list-item"><div><b>${a.action}</b><div class="muted" style="font-size:12px">${new Date(a.createdAt).toLocaleString("uz-UZ")}</div></div></div>`).join("")||"<p class='muted'>Hozircha yo‘q</p>"}</div></div>`;
}
function label(k){return ({students:"O‘quvchilar",teachers:"O‘qituvchilar",chefs:"Oshpazlar",classes:"Sinflar",products:"Mahsulotlar",purchases:"Xaridlar",coinsEarned:"Topilgan Coin",coinsSpent:"Sarflangan Coin"})[k]||k}

async function renderAdminUsers(body){
 const [users,classes]=await Promise.all([api("/admin/users"),api("/admin/classes")]);
 body.innerHTML=`<div class="row" style="justify-content:flex-end;margin-bottom:14px"><button class="primary" onclick="userModal()">+ Foydalanuvchi qo‘shish</button></div><div class="card"><table><thead><tr><th>Ism</th><th>Login</th><th>Role</th><th>Sinf</th><th>X Coin</th><th></th></tr></thead><tbody>${users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email||u.phone||"")}</td><td><span class="badge">${u.role}</span></td><td>${esc(classes.find(c=>c.id===u.classId)?.name||"—")}</td><td>${money(u.balance)}</td><td style="white-space:nowrap">${u.role!=="SUPER_ADMIN"?`<button class="ghost" onclick="resetPw('${u.id}')">🔑</button><button class="ghost" onclick="delUser('${u.id}','${esc(u.name)}')">🗑</button>`:""}</td></tr>`).join("")}</tbody></table></div>`;
}
function userModal(){
 api("/admin/classes").then(classes=>{
  document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Foydalanuvchi qo‘shish</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>Ism familiya</label><input id="unm" required></div><div class="grid2"><div class="field"><label>Email</label><input id="uem" type="email"></div><div class="field"><label>Telefon</label><input id="uph" placeholder="+998..."></div></div><div class="grid2"><div class="field"><label>Parol</label><input id="upw" type="text" value="${genRandomHint()}"></div><div class="field"><label>Role</label><select id="url"><option value="STUDENT">O‘quvchi</option><option value="TEACHER">O‘qituvchi</option><option value="PARENT">Ota-ona</option><option value="OSHPAZ">Oshpaz</option><option value="ADMIN">Admin</option></select></div></div><div class="field"><label>Sinf (o‘quvchi/o‘qituvchi uchun)</label><select id="ucl"><option value="">—</option>${classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div><button class="primary" onclick="addUser()">Saqlash</button></div></div>`);
 });
}
function genRandomHint(){return Math.random().toString(36).slice(2,8)+"A1!"}
async function addUser(){try{await api("/admin/users",{method:"POST",body:JSON.stringify({name:unm.value,email:uem.value||null,phone:uph.value||null,password:upw.value,role:url.value,classId:ucl.value||null})});modal.remove();renderAdminTab();toast("Foydalanuvchi qo‘shildi")}catch(e){toast(e.message)}}
async function resetPw(id){try{const r=await api(`/admin/users/${id}/reset-password`,{method:"POST"});alert("Yangi parol: "+r.password)}catch(e){toast(e.message)}}
async function delUser(id,name){if(!confirm(`${name} o‘chirilsinmi?`))return;try{await api(`/admin/users/${id}`,{method:"DELETE"});renderAdminTab();toast("O‘chirildi")}catch(e){toast(e.message)}}

async function renderAdminClasses(body){
 const [classes,subjects,users]=await Promise.all([api("/admin/classes"),api("/admin/subjects"),api("/admin/users")]);
 const teachers=users.filter(u=>u.role==="TEACHER");
 body.innerHTML=`<div class="grid2"><div class="card"><div class="section-title"><h2>Sinflar</h2><button class="secondary" onclick="classModal()">+ Sinf</button></div><div class="list">${classes.map(c=>`<div class="list-item"><b>${esc(c.name)}</b><span class="muted">${esc(teachers.find(t=>t.id===c.teacherId)?.name||"O‘qituvchi tayinlanmagan")}</span></div>`).join("")||"<p class='muted'>Sinf yo‘q</p>"}</div></div><div class="card"><div class="section-title"><h2>Fanlar</h2><button class="secondary" onclick="subjectModal()">+ Fan</button></div><div class="list">${subjects.map(s=>`<div class="list-item"><b>${esc(s.name)}</b></div>`).join("")||"<p class='muted'>Fan yo‘q</p>"}</div></div></div>
 <div class="card" style="margin-top:18px"><div class="section-title"><h2>Dars jadvali</h2><button class="secondary" onclick="timetableModal()">+ Qator qo‘shish</button></div><div id="ttList">Yuklanmoqda...</div></div>`;
 const tt=await api("/timetable?classId="+(classes[0]?.id||""));
 loadFullTimetable();
}
async function loadFullTimetable(){
 const classes=await api("/admin/classes");
 let rows=[];for(const c of classes){const r=await api("/timetable?classId="+c.id);rows=rows.concat(r);}
 const el=document.getElementById("ttList");if(!el)return;
 el.innerHTML=rows.length?`<table><thead><tr><th>Sinf</th><th>Kun</th><th>Vaqt</th><th>Fan</th><th>O‘qituvchi</th><th></th></tr></thead><tbody>${rows.map(t=>`<tr><td>${esc(t.class)}</td><td>${esc(t.day)}</td><td>${esc(t.time)}</td><td>${esc(t.subject)}</td><td>${esc(t.teacher)}</td><td><button class="ghost" onclick="delTimetable('${t.id}')">🗑</button></td></tr>`).join("")}</tbody></table>`:'<p class="muted">Jadval hali kiritilmagan</p>';
}
function classModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Sinf qo‘shish</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>Nomi (masalan 10-A)</label><input id="cln"></div><div class="field"><label>Bosqich</label><input id="clg" type="number"></div><button class="primary" onclick="addClass()">Saqlash</button></div></div>`)}
async function addClass(){try{await api("/admin/classes",{method:"POST",body:JSON.stringify({name:cln.value,grade:clg.value})});modal.remove();renderAdminTab();toast("Sinf qo‘shildi")}catch(e){toast(e.message)}}
function subjectModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Fan qo‘shish</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>Nomi</label><input id="sbn"></div><button class="primary" onclick="addSubject()">Saqlash</button></div></div>`)}
async function addSubject(){try{await api("/admin/subjects",{method:"POST",body:JSON.stringify({name:sbn.value})});modal.remove();renderAdminTab();toast("Fan qo‘shildi")}catch(e){toast(e.message)}}
function timetableModal(){
 Promise.all([api("/admin/classes"),api("/admin/subjects"),api("/admin/users")]).then(([classes,subjects,users])=>{
  const teachers=users.filter(u=>u.role==="TEACHER");
  document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Jadval qatori</h2><button class="ghost" onclick="modal.remove()">✕</button></div><div class="field"><label>Sinf</label><select id="ttc">${classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label>Fan</label><select id="tts">${subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div><div class="field"><label>O‘qituvchi</label><select id="ttt"><option value="">—</option>${teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select></div><div class="grid2"><div class="field"><label>Kun</label><select id="ttd">${["Dush","Sesh","Chor","Pay","Jum","Shan"].map(d=>`<option>${d}</option>`).join("")}</select></div><div class="field"><label>Vaqt</label><input id="tttm" placeholder="08:30"></div></div><div class="field"><label>Xona</label><input id="ttr"></div><button class="primary" onclick="addTimetable()">Saqlash</button></div></div>`);
 });
}
async function addTimetable(){try{await api("/timetable",{method:"POST",body:JSON.stringify({classId:ttc.value,subjectId:tts.value,teacherId:ttt.value||null,day:ttd.value,time:tttm.value,room:ttr.value})});modal.remove();renderAdminTab();toast("Qo‘shildi")}catch(e){toast(e.message)}}
async function delTimetable(id){try{await api(`/timetable/${id}`,{method:"DELETE"});loadFullTimetable();toast("O‘chirildi")}catch(e){toast(e.message)}}

async function renderAdminCanteen(body){
 const [items,report]=await Promise.all([api("/admin/canteen/items"),api("/admin/canteen/report")]);
 body.innerHTML=`<div class="row" style="justify-content:flex-end;margin-bottom:14px"><button class="primary" onclick="canteenItemModal()">+ Taom qo‘shish</button></div>
 <div class="product-grid">${items.map(it=>`<div class="card product"><img src="${it.image||'/assets/shop/notebook.svg'}"><h3>${esc(it.name)}</h3><div class="row"><span class="price">🪙 ${money(it.price)}</span><span class="badge ${it.active?'green':'red'}">${it.active?'Faol':'O‘chiq'}</span></div><div class="row" style="margin-top:8px"><button class="ghost" onclick="toggleCanteenItem('${it.id}',${!it.active})">${it.active?'O‘chirish':'Yoqish'}</button><button class="ghost" onclick="delCanteenItem('${it.id}')">🗑</button></div></div>`).join("")||"<p class='muted'>Hozircha taom yo‘q</p>"}</div>
 <div class="grid2" style="margin-top:20px"><div class="card"><div class="section-title"><h2>Oshpazlar bo‘yicha hisobot</h2></div><div class="list">${report.byChef.map(c=>`<div class="list-item"><b>${esc(c.chefName)}</b><span class="badge gold">${money(c.totalCoins)} X Coin · ${c.ordersCount} ta</span></div>`).join("")||"<p class='muted'>Hali xizmat ko‘rsatilmagan</p>"}</div></div><div class="card"><div class="section-title"><h2>Jami</h2></div><p class="price" style="font-size:24px">🪙 ${money(report.totalCoins)}</p><p class="muted">${report.ordersCount} ta buyurtma tugallangan. To‘lov maktab/davlat tomonidan platforma tashqarisida amalga oshiriladi — bu yerda faqat hisobot ko‘rsatiladi.</p></div></div>`;
}
function canteenItemModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>Oshxona taomi</h2><button class="ghost" onclick="modal.remove()">✕</button></div><form id="cif"><div class="field"><label>Nomi</label><input id="cin" required></div><div class="field"><label>Tavsif</label><textarea id="cid"></textarea></div><div class="field"><label>X Coin narxi</label><input id="cip" type="number" required></div><div class="field"><label>Rasm</label><input id="cii" type="file" accept="image/png,image/jpeg,image/webp"></div><button class="primary">Saqlash</button></form></div></div>`);cif.onsubmit=async e=>{e.preventDefault();const fd=new FormData();fd.append("name",cin.value);fd.append("description",cid.value);fd.append("price",cip.value);if(cii.files[0])fd.append("image",cii.files[0]);try{await fetch("/api/admin/canteen/items",{method:"POST",body:fd,credentials:"include"}).then(async r=>{if(!r.ok)throw new Error((await r.json()).error)});modal.remove();renderAdminTab();toast("Taom qo‘shildi")}catch(e){toast(e.message)}}}
async function toggleCanteenItem(id,active){try{await api(`/admin/canteen/items/${id}`,{method:"PATCH",body:JSON.stringify({active})});renderAdminTab()}catch(e){toast(e.message)}}
async function delCanteenItem(id){try{await api(`/admin/canteen/items/${id}`,{method:"DELETE"});renderAdminTab();toast("O‘chirildi")}catch(e){toast(e.message)}}

async function renderAdminProducts(body){
 const products=await api("/admin/products");
 body.innerHTML=`<div class="row" style="justify-content:flex-end;margin-bottom:14px"><button class="primary" onclick="productModal()">+ Mahsulot qo‘shish</button></div><div class="product-grid">${products.map(p=>`<div class="card product"><img src="${p.image||'/assets/shop/notebook.svg'}"><h3>${esc(p.name)}</h3><div class="row"><span class="price">🪙 ${money(p.price)}</span><span class="badge">${p.stock} dona</span></div><div class="row" style="margin-top:8px"><button class="ghost" onclick="delProduct('${p.id}')">🗑</button></div></div>`).join("")||"<p class='muted'>Mahsulot yo‘q</p>"}</div>`;
}
function productModal(){document.body.insertAdjacentHTML("beforeend",`<div class="modal-back" id="modal"><div class="modal"><div class="modal-head"><h2>CoinShop mahsuloti</h2><button class="ghost" onclick="modal.remove()">✕</button></div><form id="pf"><div class="field"><label>Nomi</label><input id="pn" required></div><div class="field"><label>Tavsif</label><textarea id="pd"></textarea></div><div class="grid2"><div class="field"><label>X Coin narxi</label><input id="pp" type="number" required></div><div class="field"><label>Ombor</label><input id="pst" type="number" required></div></div><div class="field"><label>Kategoriya</label><input id="pc" value="Maktab anjomlari"></div><div class="field"><label>Rasm</label><input id="pi" type="file" accept="image/png,image/jpeg,image/webp"></div><button class="primary">Saqlash</button></form></div></div>`);pf.onsubmit=async e=>{e.preventDefault();const fd=new FormData();fd.append("name",pn.value);fd.append("description",pd.value);fd.append("price",pp.value);fd.append("stock",pst.value);fd.append("category",pc.value);if(pi.files[0])fd.append("image",pi.files[0]);try{await fetch("/api/admin/products",{method:"POST",body:fd,credentials:"include"}).then(async r=>{if(!r.ok)throw new Error((await r.json()).error)});modal.remove();renderAdminTab();toast("Mahsulot qo‘shildi")}catch(e){toast(e.message)}}}
async function delProduct(id){try{await api(`/admin/products/${id}`,{method:"DELETE"});renderAdminTab();toast("O‘chirildi")}catch(e){toast(e.message)}}

// ---------- Oshpaz (Chef) panel ----------
function renderChefShell(){
 const tabs=[["scan","Skaner"],["report","Hisobot"]];
 document.getElementById("app").innerHTML=`<div class="chef-shell"><header class="chef-top"><div class="logo"><img src="/assets/logo.svg"><div>MAKTAB X<small>Oshpaz paneli</small></div></div><button class="ghost" onclick="logout()">↪ Chiqish</button></header><div class="chef-tabs">${tabs.map(t=>`<button class="${state.page===t[0]?'active':''}" onclick="go('${t[0]}')">${icons[t[0]]} ${t[1]}</button>`).join("")}</div><div id="chefBody" class="chef-body"></div></div>`;
 if(state.page==="report")renderChefReport();else renderChefScan();
}
function renderChefScan(){
 stopScan();
 const el=document.getElementById("chefBody");
 el.innerHTML=`<div class="scan-card"><video id="scanVideo" playsinline muted></video><canvas id="scanCanvas" style="display:none"></canvas><p class="muted" id="scanHint">Kamerani ishga tushirish uchun bosing</p><button class="primary" style="width:100%" id="scanBtn" onclick="startScan()">📷 Skanerlashni boshlash</button><div class="or-line">yoki QR kod matnini qo‘lda kiriting</div><div class="field"><input id="manualToken" placeholder="QR kod matni"></div><button class="secondary" style="width:100%" onclick="redeemToken(manualToken.value)">Tasdiqlash</button><div id="chefResult"></div></div>`;
}
function ensureJsQR(cb){if(window.jsQR)return cb();const s=document.createElement("script");s.src="/vendor/jsQR.js";s.onload=cb;document.head.appendChild(s);}
function startScan(){
 ensureJsQR(()=>{
  const btn=document.getElementById("scanBtn");if(btn)btn.style.display="none";
  document.getElementById("scanHint").textContent="Kamera ishga tushmoqda...";
  navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(stream=>{
   state.scanStream=stream;state.scanning=true;
   const video=document.getElementById("scanVideo");if(!video)return;
   video.srcObject=stream;video.play();
   document.getElementById("scanHint").textContent="QR kodni kameraga ko‘rsating";
   requestAnimationFrame(tickScan);
  }).catch(e=>{toast("Kameraga ruxsat berilmadi");const h=document.getElementById("scanHint");if(h)h.textContent="Kameraga ruxsat berilmadi — pastdagi maydondan qo‘lda kiriting";if(btn)btn.style.display="block";});
 });
}
function tickScan(){
 if(!state.scanning)return;
 const video=document.getElementById("scanVideo");
 if(video&&video.readyState===video.HAVE_ENOUGH_DATA&&video.videoWidth){
  const canvas=document.getElementById("scanCanvas");
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const ctx=canvas.getContext("2d");
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
  const code=window.jsQR(imgData.data,imgData.width,imgData.height,{inversionAttempts:"dontInvert"});
  if(code&&code.data){stopScan();redeemToken(code.data);return;}
 }
 requestAnimationFrame(tickScan);
}
function stopScan(){state.scanning=false;if(state.scanStream){state.scanStream.getTracks().forEach(t=>t.stop());state.scanStream=null;}}
async function redeemToken(token){
 token=String(token||"").trim();if(!token)return toast("QR kod matnini kiriting");
 const res=document.getElementById("chefResult");
 try{
  const o=await api("/canteen/redeem",{method:"POST",body:JSON.stringify({token})});
  if(res)res.innerHTML=`<div class="chef-result ok"><div style="font-size:44px">✅</div><h3>${esc(o.itemName)}</h3><p>${esc(o.studentName)} — 🪙 ${money(o.price)}</p><button class="primary" onclick="renderChefScan()">Keyingisi</button></div>`;
 }catch(e){
  if(res)res.innerHTML=`<div class="chef-result fail"><div style="font-size:44px">⚠️</div><h3>${esc(e.message)}</h3><button class="primary" onclick="renderChefScan()">Qayta urinish</button></div>`;
 }
}
async function renderChefReport(){
 const el=document.getElementById("chefBody");
 let r;try{r=await api("/oshpaz/report")}catch(e){return toast(e.message)}
 el.innerHTML=`<div class="grid2"><div class="card stat"><span class="label">Bugun</span><div class="value">🪙 ${money(r.todayCoins)}</div></div><div class="card stat"><span class="label">Jami</span><div class="value">🪙 ${money(r.totalCoins)}</div></div></div><div class="card" style="margin-top:16px"><div class="section-title"><h2>So‘nggi xizmatlar</h2></div><div class="list">${r.orders.slice(0,30).map(o=>`<div class="list-item"><div><b>${esc(o.itemName)}</b><div class="muted" style="font-size:12px">${esc(o.studentName)} · ${new Date(o.completedAt).toLocaleString("uz-UZ")}</div></div><span class="badge gold">🪙 ${money(o.price)}</span></div>`).join("")||"<p class='muted'>Hali xizmat ko‘rsatilmagan</p>"}</div></div>`;
}

async function logout(){stopScan();stopCanteenPoll();await api("/auth/logout",{method:"POST"});state.user=null;renderLogin()}
boot();
