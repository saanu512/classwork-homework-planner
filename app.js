import { CloudAPI } from "./firebase.js";

let cloudUser=null;
let adminUser=null;
let cloudBusy=false;
let cloudStudents=[];
let suppressCloudQueue=false;
let cloudSyncTimer=null;
let cloudIntervalTimer=null;
const CLOUD_SYNC_INTERVAL=15*60*1000;
const CLOUD_SAVE_DEBOUNCE=300;
const SUBJECTS = [
  "General Medicine","General Surgery","OBG","Pediatrics","ENT","Psychiatry","EYE","Dermatology",
  "Orthopaedics","Respiratory Medicine","Radiodiagnosis","Emergency Medicine","Anaesthesiology",
  "Clinical Posting","AETCOM / Pandemic Module","Monthly Assessment"
];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const WEEK = {
  Monday:[["09:00","10:00","General Medicine"],["10:00","11:00","OBG"],["11:00","14:00","Clinical Posting"],["15:00","17:00","General Medicine (Evening)"]],
  Tuesday:[["09:00","10:00","General Medicine"],["10:00","11:00","General Surgery"],["11:00","14:00","Clinical Posting"],["15:00","17:00","OBG (Evening)"]],
  Wednesday:[["09:00","10:00","General Surgery"],["10:00","11:00","Pediatrics"],["11:00","14:00","Clinical Posting"],["15:00","17:00","General Surgery (Evening)"]],
  Thursday:[["09:00","10:00","ENT"],["10:00","11:00","Psychiatry"],["11:00","14:00","Clinical Posting"],["15:00","16:00","Respiratory Medicine (Evening)"],["16:00","17:00","Pediatrics (Evening)"]],
  Friday:[["09:00","10:00","EYE"],["10:00","11:00","Dermatology"],["11:00","14:00","Clinical Posting"],["15:00","16:00","Orthopaedics (Evening)"],["16:00","17:00","General Medicine (Evening)"]],
  Saturday:[["09:00","10:00","OBG"],["10:00","11:00","Orthopaedics"],["11:00","12:00","General Surgery"],["12:00","14:00","AETCOM / Pandemic Module"],["15:00","17:00","Monthly Assessment (Evening)"]],
  Sunday:[]
};

// Exact Clinical Posting rotation retained from the Attendance Tracker.
const OLD = [
["G.Medicine","General Surgery","OBG","Pediatrics","ENT","Respiratory Medicine"],["G.Medicine","General Surgery","OBG","Pediatrics","ENT","Respiratory Medicine"],["G.Medicine","General Surgery","OBG","Pediatrics","ENT","Psychiatry"],["G.Medicine","General Surgery","OBG","Pediatrics","ENT","Psychiatry"],["G.Medicine","General Surgery","OBG","Orthopaedics","EYE","Dermatology"],["G.Medicine","General Surgery","OBG","Orthopaedics","EYE","Dermatology"],["G.Medicine","General Surgery","OBG","Orthopaedics","EYE","Anaesthesiology (ICU)"],["G.Medicine","General Surgery","OBG","Orthopaedics","EYE","Anaesthesiology (ICU)"],
["General Surgery","OBG","G.Medicine","ENT","Respiratory Medicine","Pediatrics"],["General Surgery","OBG","G.Medicine","ENT","Respiratory Medicine","Pediatrics"],["General Surgery","OBG","G.Medicine","ENT","Psychiatry","Pediatrics"],["General Surgery","OBG","G.Medicine","ENT","Psychiatry","Pediatrics"],["General Surgery","OBG","G.Medicine","EYE","Dermatology","Orthopaedics"],["General Surgery","OBG","G.Medicine","EYE","Dermatology","Orthopaedics"],["General Surgery","OBG","G.Medicine","EYE","Anaesthesiology (ICU)","Orthopaedics"],["General Surgery","OBG","G.Medicine","EYE","Anaesthesiology (ICU)","Orthopaedics"],
["OBG","G.Medicine","General Surgery","Respiratory Medicine","Pediatrics","ENT"],["OBG","G.Medicine","General Surgery","Respiratory Medicine","Pediatrics","ENT"],["OBG","G.Medicine","General Surgery","Psychiatry","Pediatrics","ENT"],["OBG","G.Medicine","General Surgery","Psychiatry","Pediatrics","ENT"],["OBG","G.Medicine","General Surgery","Dermatology","Orthopaedics","EYE"],["OBG","G.Medicine","General Surgery","Dermatology","Orthopaedics","EYE"],["OBG","G.Medicine","General Surgery","Anaesthesiology (ICU)","Orthopaedics","EYE"],["OBG","G.Medicine","General Surgery","Anaesthesiology (ICU)","Orthopaedics","EYE"],
["Respiratory Medicine","Pediatrics","ENT","OBG","G.Medicine","General Surgery"],["Respiratory Medicine","Pediatrics","ENT","OBG","G.Medicine","General Surgery"],["Psychiatry","Pediatrics","ENT","OBG","G.Medicine","General Surgery"],["Psychiatry","Pediatrics","ENT","OBG","G.Medicine","General Surgery"],["Dermatology","Orthopaedics","EYE","OBG","G.Medicine","General Surgery"],["Dermatology","Orthopaedics","EYE","OBG","G.Medicine","General Surgery"],["Anaesthesiology (ICU)","Orthopaedics","EYE","OBG","G.Medicine","General Surgery"],["Anaesthesiology (ICU)","Orthopaedics","EYE","OBG","G.Medicine","General Surgery"],
["ENT","Respiratory Medicine","Pediatrics","General Surgery","OBG","G.Medicine"],["ENT","Respiratory Medicine","Pediatrics","General Surgery","OBG","G.Medicine"],["ENT","Psychiatry","Pediatrics","General Surgery","OBG","G.Medicine"],["ENT","Psychiatry","Pediatrics","General Surgery","OBG","G.Medicine"],["EYE","Dermatology","Orthopaedics","General Surgery","OBG","G.Medicine"],["EYE","Dermatology","Orthopaedics","General Surgery","OBG","G.Medicine"],["EYE","Anaesthesiology (ICU)","Orthopaedics","General Surgery","OBG","G.Medicine"],["EYE","Anaesthesiology (ICU)","Orthopaedics","General Surgery","OBG","G.Medicine"],
["Pediatrics","ENT","Respiratory Medicine","G.Medicine","General Surgery","OBG"],["Pediatrics","ENT","Psychiatry","G.Medicine","General Surgery","OBG"],["Orthopaedics","EYE","Dermatology","G.Medicine","General Surgery","OBG"],["Orthopaedics","EYE","Anaesthesiology (ICU)","G.Medicine","General Surgery","OBG"]
];
const NEW = [["General Surgery","OBG","Radiodiagnosis","Emergency Medicine"],["General Surgery","OBG","Radiodiagnosis","Emergency Medicine"],["Emergency Medicine","Radiodiagnosis","OBG","General Surgery"],["Emergency Medicine","Radiodiagnosis","OBG","General Surgery"],["G.Medicine","ENT","Emergency Medicine","Radiodiagnosis"],["G.Medicine","ENT","Emergency Medicine","Radiodiagnosis"],["Radiodiagnosis","Emergency Medicine","ENT","G.Medicine"],["Radiodiagnosis","Emergency Medicine","ENT","G.Medicine"]];
const START = new Date(2026,8,7), SWITCH = new Date(2027,7,9);



const STORAGE='cwp-local-v30';
const STUDENT_SESSION_HINT='cwp-student-session-present';
// Administrator access is controlled by Firebase Authentication + Firestore admin allow-list.
let adminSession=false;
let adminAuthInProgress=false;
// Admin-only controls are never rendered in student screens. Admin session exists only in memory.

let D={profile:{name:'',email:'',roll:''},teachers:{},records:{},extras:[],changes:[],theme:'system',schedule:null,reminders:[],syllabus:{},admin:{geminiKey:''},settings:{reminderEnabled:true,oneDayBefore:true,reminderLead:60,lastSyncAt:0},_savedAt:0};
let today=startOfDay(new Date());
let midnightTimer=null;
const $=id=>document.getElementById(id); const clone=x=>JSON.parse(JSON.stringify(x));
function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function iso(d){const x=startOfDay(d);return x.toISOString().slice(0,10)}
function fmt(d){return d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)}
function saveAll(){try{D._savedAt=Date.now();localStorage.setItem(STORAGE,JSON.stringify(D));if(cloudUser&&!suppressCloudQueue){clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>syncCurrentUser('upload',true),CLOUD_SAVE_DEBOUNCE)}return true}catch(e){toast('Device storage is unavailable');return false}}
function loadLocal(){try{const raw=localStorage.getItem(STORAGE);if(raw){const L=JSON.parse(raw)||{};D={...D,...L,profile:{...D.profile,...(L.profile||{})},records:{...D.records,...(L.records||{})},teachers:{...D.teachers,...(L.teachers||{})},admin:{...D.admin,...(L.admin||{})},settings:{...D.settings,...(L.settings||{})},extras:Array.isArray(L.extras)?L.extras:[],changes:Array.isArray(L.changes)?L.changes:[],reminders:Array.isArray(L.reminders)?L.reminders:[],syllabus:L.syllabus||{}}}}catch(e){console.warn(e)} D.schedule=normalizeSchedule(D.schedule)}
function defaultSchedule(){return clone(WEEK)}
function normalizeSchedule(s){const out=defaultSchedule();if(!s)return out;DAYS.forEach(day=>{if(Array.isArray(s[day]))out[day]=s[day].map(x=>[x[0],x[1],x[2]]).filter(x=>x[0]&&x[1]&&x[2])});return out}
function scheduleForDate(d){let result=normalizeSchedule(D.schedule);const target=iso(d);const changes=(D.changes||[]).filter(x=>x&&x.date&&x.date<=target).sort((a,b)=>a.date.localeCompare(b.date));if(changes.length){const c=normalizeSchedule(changes.at(-1).schedule);if(DAYS.some(day=>c[day]?.length))result=c}return result}
function clinical(d){let r=+D.profile.roll;if(!(r>=1&&r<=100))return'Clinical Posting';let m=startOfDay(d);m.setDate(m.getDate()-((m.getDay()+6)%7));let arr=d<SWITCH?OLD:NEW,st=d<SWITCH?START:SWITCH,w=Math.floor((m-st)/604800000),g=d<SWITCH?(r<=16?0:r<=32?1:r<=49?2:r<=66?3:r<=83?4:5):(r<=25?0:r<=50?1:r<=75?2:3);return arr[w]?.[g]||'Clinical Posting'}
function displaySubject(s,d){return s==='Clinical Posting'?clinical(d):s}
function recKey(c,d=today){return iso(d)+'|'+c.time+'|'+c.subject+'|'+(c.scheduledSubject||'')}
function legacyRecKey(c,d=today){return iso(d)+'|'+c.subject+'|'+(c.teacher||D.teachers[c.scheduledSubject]||'')}
function recordForClass(c){return D.records[recKey(c)]||D.records[legacyRecKey(c)]||{}}
function classesForDate(d){const day=d.toLocaleDateString('en-US',{weekday:'long'}),s=scheduleForDate(d);const base=(s[day]||[]).map(x=>({time:x[0]+'–'+x[1],subject:displaySubject(x[2],d),scheduledSubject:x[2],teacher:D.teachers[x[2]]||D.teachers[displaySubject(x[2],d)]||''}));const extras=(D.extras||[]).filter(x=>x.date===iso(d)).map(x=>({time:x.time,subject:x.subject,scheduledSubject:x.subject,teacher:x.teacher||'',extra:true,id:x.id}));return base.concat(extras)}
function setTheme(){document.documentElement.dataset.theme=D.theme||'system'}
function cloudSafeData(){
  const x=clone(D); delete x.admin; delete x._savedAt; return x;
}
function mergeCloudIntoLocal(c){
  if(!c)return;
  // Cloud is authoritative when restoring an existing account.
  // Replace collections so deleted/edited records do not reappear.
  D={...D,...c,
    profile:{...D.profile,...(c.profile||{})},
    teachers:{...(c.teachers||{})},
    records:{...(c.records||{})},
    extras:Array.isArray(c.extras)?c.extras:[],
    changes:Array.isArray(c.changes)?c.changes:[],
    reminders:Array.isArray(c.reminders)?c.reminders:[],
    syllabus:{...(c.syllabus||{})},
    settings:{...D.settings,...(c.settings||{})}
  };
  D.schedule=normalizeSchedule(D.schedule);
  localStorage.setItem(STORAGE,JSON.stringify(D));
}
async function syncCurrentUser(direction='upload',quiet=false){
  if(!cloudUser||cloudBusy)return false;
  cloudBusy=true; const previousSuppress=suppressCloudQueue; suppressCloudQueue=true;
  try{
    if(direction==='download'){
      const remote=await CloudAPI.getUserData(cloudUser.uid);
      if(remote){mergeCloudIntoLocal(remote); D.settings.lastSyncAt=Date.now(); localStorage.setItem(STORAGE,JSON.stringify(D)); if(!quiet)toast('✓ Cloud data loaded');}
      else if(!quiet)toast('No cloud data found');
    }else{
      await CloudAPI.saveUserData(cloudUser.uid,cloudSafeData());
      D.settings.lastSyncAt=Date.now();
      localStorage.setItem(STORAGE,JSON.stringify(D));
      const status=$('cloudAccountStatus');
      if(status)status.textContent=`Last synced: ${new Date(D.settings.lastSyncAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}`;
      if(!quiet)toast('✓ Firebase synchronized');
    }
    return true;
  }catch(e){
    console.error('Cloud sync failed:', e);
    const code=e?.code||e?.name||'unknown';
    const detail=({
      'permission-denied':'Permission denied by Firestore Rules.',
      'failed-precondition':'Firestore is not ready or the database is unavailable.',
      'unavailable':'Firebase is temporarily unavailable or offline.',
      'unauthenticated':'Firebase session expired. Please sign in again.',
      'invalid-argument':'Firebase rejected the data. The app has sanitized unsupported values; try SYNC NOW again.',
      'resource-exhausted':'Firebase quota/resource limit reached.'
    })[code] || `Firebase error: ${code}`;
    const status=$('cloudAccountStatus');
    if(status)status.textContent=detail;
    toast(detail);
    return false
  }
  finally{suppressCloudQueue=previousSuppress;cloudBusy=false}
}
function startAutomaticCloudSync(){
  clearInterval(cloudIntervalTimer);
  if(!cloudUser)return;
  // Sync immediately when the app starts/reauthenticates, then every 15 minutes while active.
  syncCurrentUser('upload',true);
  cloudIntervalTimer=setInterval(()=>{if(document.visibilityState==='visible')syncCurrentUser('upload',true)},CLOUD_SYNC_INTERVAL);
}
function stopAutomaticCloudSync(){clearInterval(cloudIntervalTimer);cloudIntervalTimer=null}
async function cloudSignIn(email,password){
  try{
    await CloudAPI.setPersistence();
    const cred=await CloudAPI.signIn(email,password);
    cloudUser=cred.user||CloudAPI.currentUser();
    try{localStorage.setItem(STUDENT_SESSION_HINT,'1')}catch(_){}
    D.profile.email=cloudUser?.email||D.profile.email;
    saveAll();
    if($('settings'))show('settings');
    toast(`✓ Signed in as ${cloudUser?.email||email}`);
    await syncCurrentUser('download',true);
    startAutomaticCloudSync();
    return true;
  }catch(e){console.error(e);toast(firebaseAuthMessage(e));return false}
}
async function cloudSignUp(email,password){
  try{
    await CloudAPI.setPersistence();
    const cred=await CloudAPI.signUp(email,password);
    cloudUser=cred.user||CloudAPI.currentUser();
    try{localStorage.setItem(STUDENT_SESSION_HINT,'1')}catch(_){}
    // New accounts must never inherit another account's cloud-owned records.
    D={...D,profile:{...D.profile,email:cloudUser?.email||email},teachers:{},records:{},extras:[],changes:[],reminders:[],syllabus:{}};
    saveAll();
    if($('settings'))show('settings');
    toast(`✓ Account created and signed in as ${cloudUser?.email||email}`);
    await syncCurrentUser('upload',true);
    startAutomaticCloudSync();
    return true;
  }catch(e){console.error(e);toast(firebaseAuthMessage(e));return false}
}
function firebaseAuthMessage(e){
  const c=e?.code||'';
  return ({'auth/invalid-credential':'Invalid email or password.','auth/invalid-email':'Enter a valid email.','auth/email-already-in-use':'This email is already registered.','auth/weak-password':'Password must be at least 6 characters.','auth/too-many-requests':'Too many attempts. Try again later.'}[c])||'Authentication failed. Please try again.';
}
function cloudAccountMarkup(){
  if(cloudUser){const ls=D.settings?.lastSyncAt?`Last synced: ${new Date(D.settings.lastSyncAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}`:'Last synced: Not yet';return `<div class="cloudAccount"><div><b>✓ Signed in</b><small>${esc(cloudUser.email||'')}</small></div><div class="twoCol"><button class="settingSave" id="cloudSyncNow">SYNC NOW</button><button class="settingSave" id="cloudLogout">LOG OUT</button></div><p class="statusPill" id="cloudAccountStatus">${esc(ls)}</p></div>`;}
  return `<div class="cloudAccount"><label>Email</label><input id="cloudEmail" type="email" autocomplete="email" placeholder="Student email"><label>Password</label><input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Password (6+ characters)"><div class="twoCol"><button class="settingSave" id="cloudLogin">LOGIN</button><button class="settingSave" id="cloudSignup">CREATE ACCOUNT</button></div><p class="statusPill">Not signed in — local data remains on this device</p></div>`;
}
async function loadAdminCloudData(el){
  try{
    cloudStudents=await CloudAPI.getAllStudents();
    const list=$('studentList'); if(!list)return;
    list.innerHTML=cloudStudents.length?cloudStudents.map((st,i)=>`<div class="adminListRow"><div><b>${esc(st.profile?.name||st.name||'Unnamed student')}</b><small>${esc(st.profile?.email||st.email||'')} ${st.profile?.roll?' · Roll '+esc(st.profile.roll):''}</small></div><div class="adminRowActions"><button class="addRow" data-cloud-view="${i}">VIEW RECORDS</button></div></div>`).join(''):'<div class="empty glass">No student cloud records yet.</div>';
    list.querySelectorAll('[data-cloud-view]').forEach(b=>b.onclick=()=>showCloudStudentDetails(cloudStudents[Number(b.dataset.cloudView)]));
    const note=document.querySelector('#studentsPanel .adminNote'); if(note)note.textContent='Cloud-connected students. Select VIEW RECORDS to inspect saved classwork, homework and syllabus.';
  }catch(e){console.error('Admin cloud read failed:',e);const note=document.querySelector('#studentsPanel .adminNote');if(note)note.textContent=`Unable to read cloud students (${e?.code||'unknown'}). Check the published Firestore Rules.`}
}
function showCloudStudentDetails(st){
  const box=$('studentCloudDetail'); if(!box)return;
  const d=st||{}, rec=Object.entries(d.records||{}), hw=rec.filter(([,r])=>r.homework), topics=rec.filter(([,r])=>r.topic);
  const syl=d.syllabus||{};
  box.innerHTML=`<div class="adminRecord"><h3>${esc(d.profile?.name||'Student')}</h3><small>${esc(d.profile?.email||'')} ${d.profile?.roll?' · Roll '+esc(d.profile.roll):''}</small><p><b>${rec.length}</b> classwork records · <b>${hw.length}</b> homework records · <b>${topics.length}</b> taught-topic records</p></div><h4 class="subhead">Classwork</h4>${topics.slice().reverse().slice(0,50).map(([k,r])=>{const m=recordMeta(k);return `<div class="adminRecord"><b>${esc(m.subject)}</b><span>${esc(m.date)} · ${esc(m.time)}</span><p><strong>Chapter:</strong> ${esc(r.chapter||'—')} · <strong>Topic:</strong> ${esc(r.topic||'—')}</p><small>Teacher: ${esc(r.teacher||'—')}</small></div>`}).join('')||'<div class="empty glass">No classwork records.</div>'}<h4 class="subhead">Homework</h4>${hw.slice().reverse().slice(0,50).map(([k,r])=>{const m=recordMeta(k);return `<div class="adminRecord"><b>${esc(m.subject)}</b><span>${esc(m.date)} · ${esc(m.time)}</span><p>${esc(r.homework)}</p><small>${r.completed?'✓ Completed':'○ Pending'}</small></div>`}).join('')||'<div class="empty glass">No homework records.</div>'}<h4 class="subhead">Syllabus</h4>${Object.entries(syl).map(([sub,arr])=>`<div class="adminRecord"><b>${esc(sub)}</b><p>${(Array.isArray(arr)?arr:[]).slice(-20).map(t=>`${esc(t.chapter||'No chapter')}: ${esc(t.topic||'')}`).join(' · ')||'No topics'}</p></div>`).join('')||'<div class="empty glass">No syllabus records.</div>'}`;
  box.scrollIntoView({behavior:'smooth',block:'start'});
}

function show(page){
  // Authentication gate: no one can enter any app page until either a
  // student session or an authorized admin session is active. The only
  // unauthenticated page allowed is the dedicated Admin Login screen.
  if(!cloudUser&&!adminUser&&page!=='adminLogin'){
    showStartupAuth();
    return;
  }
  if(page==='admin'&&!adminSession){return showAdminLogin()}
  document.querySelectorAll('main>section').forEach(x=>x.remove());
  const s=document.createElement('section');s.id=page;$('main').appendChild(s);
  $('pageTitle').textContent={today:'Today',homework:'Homework',syllabus:'Syllabus',ai:'Gemini AI',settings:'Settings',admin:'Admin Dashboard',adminLogin:'Admin Login',reminders:'Reminders'}[page]||page;
  $('dateLine').textContent=page==='today'?fmt(today):'';
  ({today:renderToday,homework:renderHomework,syllabus:renderSyllabus,ai:renderAI,settings:renderSettings,admin:renderAdmin,reminders:renderReminders}[page]||(()=>{}))(s);
}
function navBar(){return `<nav><button data-page="today">⌂<br>Today</button><button data-page="homework">✓<br>Homework</button><button data-page="syllabus">◈<br>Syllabus</button><button data-page="ai">✦<br>Gemini AI</button><button data-page="settings">⚙<br>Settings</button></nav>`}
function calendarBar(){return `<div class="calendarbar"><button class="iconBtn" id="prev">‹</button><button class="datePicker" id="datePicker"><span class="calendarIcon">▣</span><span>${esc(fmt(today))}</span></button><button class="iconBtn" id="next">›</button><button class="todayBtn" id="jumpToday">Today</button><input id="hiddenDate" type="date" value="${iso(today)}"></div>`}
function classCardMarkup(c,i){const r=recordForClass(c),teacher=r.teacher||c.teacher||D.teachers[c.scheduledSubject]||D.teachers[c.subject]||'';return `<div class="classEntryWrap" data-i="${i}"><article class="classCard ${c.extra?'extraCard':''}"><div class="cardTopRow"><span class="timePill">${esc(c.time)}</span><div class="cardSubject"><h2>${esc(c.subject)}</h2><input class="cardTeacherInput teacherUnderSubject" value="${esc(teacher)}" placeholder="Teacher name"><small class="defaultTeacher subjectDefaultTeacher">Default teacher: ${esc(c.teacher||'Not set')}</small></div>${c.extra?'<span class="extraPill">EXTRA</span>':''}</div><div class="cardChapter"><label class="cardFieldLabel">CHAPTER</label><input class="cardChapterInput" value="${esc(r.chapter||'')}" placeholder="Chapter (optional)"></div><div class="cardMiddle"><div class="cardHalf"><label class="cardFieldLabel">TOPIC TAUGHT</label><textarea class="cardTopic" placeholder="What was taught today?">${esc(r.topic||'')}</textarea></div><div class="cardHalf"><label class="cardFieldLabel">HOMEWORK</label><textarea class="cardHomework" placeholder="Homework / assignment">${esc(r.homework||'')}</textarea></div></div><div class="cardActions"><button class="cardSaveBtn">SAVE</button>${c.extra?'<button class="cardDeleteBtn">DELETE</button>':''}</div></article></div>`}
function renderToday(el){const a=classesForDate(today);el.innerHTML=calendarBar()+`<div class="dayHint">${a.length?`${a.length} class${a.length===1?'':'es'} scheduled`:'No classes scheduled'}</div>`+(a.length?a.map(classCardMarkup).join(''):'<div class="empty glass">Your day is clear.</div>')+`<button class="extraBtn" id="extra">＋ Extra Class</button><div class="miniCard"><div class="miniTitle"><b>Quick actions</b><span>${D.reminders.filter(r=>!r.done).length} reminders</span></div><p class="small">Tap a class to record the topic, actual teacher and homework. The schedule remains unchanged.</p><button class="chip" id="openReminders">VIEW REMINDERS</button></div>`;
 $('prev').onclick=()=>{today.setDate(today.getDate()-1);show('today')};$('next').onclick=()=>{today.setDate(today.getDate()+1);show('today')};$('jumpToday').onclick=()=>{today=startOfDay(new Date());show('today')};$('datePicker').onclick=()=>{const x=$('hiddenDate');x.showPicker?x.showPicker():x.click()};$('hiddenDate').onchange=e=>{today=startOfDay(new Date(e.target.value+'T00:00:00'));show('today')};$('extra').onclick=extra;$('openReminders').onclick=()=>show('reminders');
 el.querySelectorAll('.cardSaveBtn').forEach((b,i)=>b.onclick=()=>saveCard(a[i],b));el.querySelectorAll('.cardDeleteBtn').forEach((b,i)=>b.onclick=async()=>{const c=a[i];if(!await confirmBox('Delete extra class?','This extra class will be removed.'))return;D.extras=D.extras.filter(x=>x.id!==c.id);saveAll();toast('✓ Extra class deleted');show('today')});
 el.querySelectorAll('.classEntryWrap').forEach((w,i)=>['.cardChapterInput','.cardTopic','.cardHomework','.cardTeacherInput'].forEach(sel=>{w.querySelector(sel)?.addEventListener('input',()=>{const c=a[i],old=recordForClass(c);D.records[recKey(c)]={...old,teacher:w.querySelector('.cardTeacherInput').value.trim(),chapter:w.querySelector('.cardChapterInput').value.trim(),topic:w.querySelector('.cardTopic').value,homework:w.querySelector('.cardHomework').value};saveAll();})}));}
function saveCard(c,btn){const w=btn.closest('.classEntryWrap'),old=recordForClass(c),teacher=w.querySelector('.cardTeacherInput').value.trim(),chapter=w.querySelector('.cardChapterInput').value.trim(),topic=w.querySelector('.cardTopic').value,homework=w.querySelector('.cardHomework').value;D.records[recKey(c)]={teacher,chapter,topic,homework,completed:!!old.completed};if(teacher){D.teachers[c.scheduledSubject||c.subject]=teacher;D.teachers[c.subject]=teacher}saveAll();btn.textContent='✓ SAVED';toast('✓ Classwork saved');scheduleHomeworkReminder(c,homework);setTimeout(()=>btn.textContent='SAVE',1200)}
function extra(){const el=document.createElement('section');el.id='details';$('main').replaceChildren(el);$('pageTitle').textContent='Extra Class';$('dateLine').textContent=fmt(today);el.innerHTML=`<button class="backLink" id="eback">‹ Back to Today</button><div class="formCard"><div class="detailHero"><span class="subjectIcon">＋</span><div><div class="eyebrow">EXTRA CLASS</div><h2>Add to this date</h2><p>${esc(fmt(today))}</p></div></div><label>Subject</label><select id="es">${SUBJECTS.map(x=>`<option>${esc(x)}</option>`).join('')}</select><div class="twoCol"><div><label>Start</label><input id="st" type="time"></div><div><label>End</label><input id="en" type="time"></div></div><label>Teacher</label><input id="et" placeholder="Teacher name"><button class="primary wideAction" id="esave">SAVE EXTRA CLASS</button></div>`;$('eback').onclick=()=>show('today');$('esave').onclick=()=>{if(!$('st').value||!$('en').value||$('en').value<=$('st').value){toast('Choose valid start and end time');return}D.extras.push({id:Date.now().toString(36),date:iso(today),subject:$('es').value,time:$('st').value+'–'+$('en').value,teacher:$('et').value.trim()||'Not set'});saveAll();toast('✓ Extra class saved');show('today')}}
function recordMeta(k){const p=k.split('|');return{date:p[0]||'',time:p[1]||'',subject:p[2]||'',scheduled:p[3]||''}}
function homeworkEntries(){return Object.entries(D.records).filter(([k,r])=>r.homework&&r.homework.trim()).map(([k,r])=>({k,r,m:recordMeta(k)}))}
function renderHomework(el){const entries=homeworkEntries(),subjects=['All subjects',...SUBJECTS],dates=['All dates',...new Set(entries.map(x=>x.m.date).sort().reverse())];el.innerHTML=`<div class="sectionHead"><div><div class="eyebrow">WORK TO COMPLETE</div><h2>Homework</h2><p class="mutedIntro">Pending and completed homework, with due-date reminders.</p></div></div><div class="filterBar"><select id="hwSubject">${subjects.map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="hwDate">${dates.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div id="hwList"></div>`;const draw=()=>{const sf=$('hwSubject').value,df=$('hwDate').value,f=entries.filter(x=>(sf==='All subjects'||x.m.subject===sf)&&(df==='All dates'||x.m.date===df)),p=f.filter(x=>!x.r.completed),d=f.filter(x=>x.r.completed),card=x=>`<div class="miniCard"><div class="miniTitle"><b>${esc(x.m.subject)}</b><span>${esc(x.m.date)} • ${esc(x.m.time)}</span></div><div class="small">${esc(x.r.teacher||D.teachers[x.m.scheduled]||'Teacher not set')}</div><p>${esc(x.r.homework)}</p><button class="chip" data-k="${esc(x.k)}">${x.r.completed?'Mark pending':'✓ Mark completed'}</button></div>`;$('hwList').innerHTML=`<h3 class="subhead">Pending <span>${p.length}</span></h3>${p.length?p.map(card).join(''):'<div class="empty glass">No pending homework.</div>'}<h3 class="subhead">Completed <span>${d.length}</span></h3>${d.length?d.map(card).join(''):'<div class="empty glass">No completed homework.</div>'}`;$('hwList').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{D.records[b.dataset.k].completed=!D.records[b.dataset.k].completed;saveAll();draw()})};$('hwSubject').onchange=draw;$('hwDate').onchange=draw;draw()}
function syllabusData(){const out={};Object.entries(D.records).forEach(([k,r])=>{const m=recordMeta(k);if(r.topic){(out[m.subject]??=[]).push({date:m.date,time:m.time,teacher:r.teacher||D.teachers[m.scheduled]||'Teacher not set',topic:r.topic,chapter:r.chapter||''})}});Object.keys(out).forEach(s=>{const seen=new Set();out[s]=out[s].filter(x=>{const q=x.date+'|'+x.time+'|'+x.topic;if(seen.has(q))return false;seen.add(q);return true}).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))});return out}
function renderSyllabus(el){const data=syllabusData();el.innerHTML=`<div class="sectionHead"><div><div class="eyebrow">LEARNING MAP</div><h2>Syllabus</h2><p class="mutedIntro">Subject-wise topics taught and progress from your daily records.</p></div><button class="primary exportBtn" id="exportAll">EXPORT PDF</button></div><div class="subjectGrid">${SUBJECTS.map(s=>{const n=(data[s]||[]).length;return `<button class="subjectTile" data-subject="${esc(s)}"><b>${esc(s)}</b><span>${n} topic${n===1?'':'s'}</span></button>`}).join('')}</div>`;el.querySelectorAll('[data-subject]').forEach(b=>b.onclick=()=>renderSyllabusDetail(b.dataset.subject));$('exportAll').onclick=()=>exportSyllabusPDF()}
function renderSyllabusDetail(subject){const el=$('syllabus'),data=syllabusData()[subject]||[];$('pageTitle').textContent=subject;$('dateLine').textContent='Saved topics';el.innerHTML=`<button class="backLink" id="syllBack">‹ All subjects</button><div class="sectionHead"><div><div class="eyebrow">${esc(subject)}</div><h2>Topics</h2></div><button class="primary exportBtn" id="exportTopics">EXPORT PDF</button></div>${data.length?`<div class="topicList">${data.map(x=>`<div class="topicRecord"><div class="topicDate"><b>${esc(x.date)}</b><span>${esc(x.time)}</span></div><div><h3>${esc(x.topic)}</h3>${x.chapter?`<p>Chapter: ${esc(x.chapter)}</p>`:''}<small>Teacher: ${esc(x.teacher)}</small></div></div>`).join('')}</div>`:'<div class="empty glass">No saved topics yet.</div>'}`;$('syllBack').onclick=()=>show('syllabus');$('exportTopics').onclick=()=>exportSyllabusPDF(subject)}
function exportSyllabusPDF(subject){
  const data=syllabusData();
  const list=subject?(data[subject]||[]).map(x=>({...x,subject})):Object.entries(data).flatMap(([subject,items])=>items.map(x=>({...x,subject})));
  const rows=list.map(x=>`<tr><td>${esc(x.subject||'')}</td><td>${esc(x.date||'')}</td><td>${esc(x.time||'')}</td><td>${esc(x.chapter||'')}</td><td>${esc(x.topic||'')}</td><td>${esc(x.teacher||'')}</td></tr>`).join('');
  const w=window.open('','_blank');
  if(!w){toast('Allow pop-ups for this app to print.');return;}
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Classwork Planner</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:22px;margin:0 0 16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:8px;text-align:left;vertical-align:top}th{background:#eee}@media print{body{padding:0}h1{margin-bottom:12px}table{font-size:11px}}</style></head><body><h1>Classwork Planner — ${esc(subject||'Syllabus')}</h1><table><thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Chapter</th><th>Topic</th><th>Teacher</th></tr></thead><tbody>${rows||'<tr><td colspan="6">No saved topics.</td></tr>'}</tbody></table><script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)};window.onafterprint=function(){setTimeout(function(){window.close()},200)};<\/script></body></html>`);
  w.document.close();
}

function remindersDue(){return (D.reminders||[]).filter(r=>!r.done).sort((a,b)=>a.when-b.when)}
function scheduleHomeworkReminder(c,homework){if(!homework)return;const dueDate=iso(today);const due=new Date(dueDate+'T23:59:00').getTime();const when=D.settings.oneDayBefore?Math.max(Date.now()+30000,due-86400000):Math.max(Date.now()+30000,due-((D.settings.reminderLead||60)*60000));D.reminders=(D.reminders||[]).filter(r=>!(r.sourceKey===recKey(c)&&!r.done));D.reminders.push({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(36),sourceKey:recKey(c),subject:c.subject,homework,due,when,done:false});saveAll();scheduleNextReminder()}
function scheduleNextReminder(){if(!('Notification' in window))return;const r=remindersDue()[0];if(!r)return;const delay=Math.max(1000,r.when-Date.now());clearTimeout(window.__cwpReminderTimer);window.__cwpReminderTimer=setTimeout(()=>{fireReminder(r);},Math.min(delay,2147483647))}
async function fireReminder(r){if(r.done)return;D.reminders=D.reminders.filter(x=>x.id!==r.id);saveAll();if(Notification.permission==='granted')new Notification('Homework Reminder',{body:`${r.subject}: ${r.homework}`});else toast(`Homework reminder: ${r.subject}`);scheduleNextReminder()}
async function requestNotifications(){try{const bridge=window.Android||window.android||window.AndroidBridge;if(bridge){const fn=bridge.requestNotificationPermission||bridge.requestNotifications||bridge.enableNotifications;if(typeof fn==='function'){fn.call(bridge);D.settings.notificationsEnabled=true;saveAll();toast('✓ Android notifications enabled');scheduleNextReminder();return}}if('Notification' in window){const p=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(p==='granted'){D.settings.notificationsEnabled=true;saveAll();try{const reg=await navigator.serviceWorker?.ready;if(reg?.showNotification)await reg.showNotification('Classwork Planner',{body:'Homework reminders are enabled.',tag:'cwp-test'});else new Notification('Classwork Planner',{body:'Homework reminders are enabled.'})}catch(_){try{new Notification('Classwork Planner',{body:'Homework reminders are enabled.'})}catch(_){}}toast('✓ Android notifications enabled');scheduleNextReminder();return}toast(p==='denied'?'Notifications are blocked. Allow them in Android app settings.':'Notification permission was not granted.');return}D.settings.notificationsPendingNative=true;saveAll();toast('✓ Android notification setup saved — native alarms will be used by the Android app wrapper.')}catch(e){D.settings.notificationsPendingNative=true;saveAll();toast('✓ Notification setup saved for Android')}}
function renderReminders(el){const list=remindersDue();el.innerHTML=`<div class="sectionHead"><div><div class="eyebrow">SMART REMINDERS</div><h2>Homework Reminders</h2><p class="mutedIntro">One-day-before reminders are enabled by default.</p></div></div><div class="formCard"><button class="primary wideAction" id="notify">ENABLE ANDROID NOTIFICATIONS</button><div class="miniCard"><b>Reminder logic</b><p class="small">When homework is saved, the app creates a reminder for the previous day. Browser/PWA notifications use the service worker; the Android build can use the same reminder records with native alarms so reminders can fire reliably even when the app is closed.</p></div></div><h3 class="subhead">Scheduled <span>${list.length}</span></h3>${list.length?list.map(r=>`<div class="miniCard"><div class="miniTitle"><b>${esc(r.subject)}</b><span>${new Date(r.when).toLocaleString('en-IN')}</span></div><p>${esc(r.homework)}</p><small>Due: ${new Date(r.due).toLocaleString('en-IN')}</small></div>`).join(''):'<div class="empty glass">No scheduled reminders.</div>'}`;$('notify').onclick=requestNotifications}
function aiContext(){const records=Object.entries(D.records).map(([k,r])=>({meta:recordMeta(k),teacher:r.teacher,topic:r.topic,homework:r.homework,completed:r.completed}));return JSON.stringify({profile:D.profile,teachers:D.teachers,records,reminders:D.reminders,syllabus:syllabusData()},null,2)}
async function askGemini(prompt){const key=D.admin?.geminiKey||'';if(!key){toast('Gemini is not configured. Ask the administrator to add the API key.');return}const model='gemini-2.5-flash';const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;const body={contents:[{parts:[{text:`You are the Classwork Planner study assistant. Answer clearly and accurately. You may use the student's records below. Do not invent records.\n\nSTUDENT DATA:\n${aiContext()}\n\nUSER QUESTION:\n${prompt}`}]}],generationConfig:{temperature:.25}};try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j?.error?.message||'Gemini request failed');return j?.candidates?.[0]?.content?.parts?.map(x=>x.text).join('\n')||'No answer returned.'}catch(e){toast(e.message||'Gemini error');return ''}}
function renderAI(el){el.innerHTML=`<div class="sectionHead"><div><div class="eyebrow">STUDY ASSISTANT</div><h2>Gemini AI</h2><p class="mutedIntro">Ask anything. Gemini can also use your saved classwork, homework and syllabus.</p></div></div><div class="formCard"><label>Ask Gemini</label><textarea id="aiPrompt" placeholder="e.g. Consolidate my syllabus and make a revision plan."></textarea><div class="suggestions"><button class="chip" data-q="Consolidate my syllabus">Consolidate my syllabus</button><button class="chip" data-q="What did I study this week?">What did I study this week?</button><button class="chip" data-q="Which topics need revision?">Topics needing revision</button><button class="chip" data-q="Prioritize my homework">Prioritize my homework</button></div><button class="primary wideAction" id="askAI">ASK GEMINI</button><div id="aiAnswer" class="miniCard" style="display:none"></div></div>`;el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('aiPrompt').value=b.dataset.q});$('askAI').onclick=async()=>{const p=$('aiPrompt').value.trim();if(!p)return toast('Enter a question');$('askAI').disabled=true;$('askAI').textContent='THINKING…';const a=await askGemini(p);if(a){$('aiAnswer').style.display='block';$('aiAnswer').innerHTML=esc(a).replace(/\n/g,'<br>')}$('askAI').disabled=false;$('askAI').textContent='ASK GEMINI'}}
function closeStartupAuth(){const m=$('startupAuth');if(m)m.style.display='none'}
function showStartupAuth(){
  if(cloudUser||adminUser){closeStartupAuth();return;}
  const m=$('startupAuth');
  if(!m)return;
  m.style.display='grid';
  const status=$('startAuthStatus');
  if(status && !status.dataset.wired){
    status.dataset.wired='1';
    $('startLogin').onclick=async()=>{const e=$('startEmail').value.trim(),pw=$('startPassword').value;if(!e||!pw){status.textContent='Enter email and password';return}status.textContent='Signing in…';const ok=await cloudSignIn(e,pw);if(ok){status.textContent=`✓ Signed in as ${e}`;setTimeout(closeStartupAuth,350)}};
    $('startSignup').onclick=async()=>{const e=$('startEmail').value.trim(),pw=$('startPassword').value;if(!e||!pw){status.textContent='Enter email and password';return}status.textContent='Creating account…';const ok=await cloudSignUp(e,pw);if(ok){status.textContent=`✓ Account created and signed in as ${e}`;setTimeout(closeStartupAuth,350)}};
    $('startAdmin').onclick=()=>{closeStartupAuth();showAdminLogin()};
    $('startPassword').onkeydown=e=>{if(e.key==='Enter')$('startLogin').click()};
  }
  if(status && status.textContent==='Checking sign-in status…')status.textContent='Not signed in — local data stays on this device until you sign in.';
}
function showAdminLogin(){document.querySelectorAll('main>section').forEach(x=>x.remove());const s=document.createElement('section');s.id='adminLogin';$('main').appendChild(s);$('pageTitle').textContent='Admin Login';$('dateLine').textContent='';s.innerHTML=`<div class="authWrap"><div class="authCard glass"><div class="eyebrow">RESTRICTED AREA</div><h2>Admin Login</h2><p class="mutedIntro">Administrator access uses Firebase Authentication plus an Admin allow-list. A normal student account cannot open this dashboard.</p><label>Admin email</label><input id="adminUser" type="email" autocomplete="username" placeholder="Admin email"><label>Password</label><input id="adminPass" type="password" autocomplete="current-password" placeholder="Password"><button class="primary wideAction" id="adminLoginBtn">LOGIN AS ADMIN</button><button class="backLink" id="adminCancel">← Back to Login</button><p class="tinyNote">The account must also have a Firestore document at <b>admins/&lt;Firebase UID&gt;</b> with <b>role = admin</b>. This grants administrator privileges.</p></div></div>`;$('adminLoginBtn').onclick=async()=>{const e=$('adminUser').value.trim(),p=$('adminPass').value;if(!e||!p)return toast('Enter admin email and password');$('adminLoginBtn').disabled=true;$('adminLoginBtn').textContent='AUTHENTICATING…';adminAuthInProgress=true;try{await CloudAPI.adminSetPersistence();await CloudAPI.adminSignIn(e,p);const u=CloudAPI.adminCurrentUser();if(await CloudAPI.isAdmin(u?.uid)){adminSession=true;adminUser=u;show('admin');toast('✓ Admin login successful')}else{await CloudAPI.adminSignOut();toast('Authenticated, but this account is not an admin. Add its UID to the Firestore admins collection.')}}catch(err){toast(firebaseAuthMessage(err))}finally{adminAuthInProgress=false}$('adminLoginBtn').disabled=false;$('adminLoginBtn').textContent='LOGIN AS ADMIN'};$('adminPass').onkeydown=e=>{if(e.key==='Enter')$('adminLoginBtn').click()};$('adminCancel').onclick=()=>{showAdminLoginBackToStudentGate()}}
function showAdminLoginBackToStudentGate(){
  document.querySelectorAll('main>section').forEach(x=>x.remove());
  $('pageTitle').textContent='Today';
  $('dateLine').textContent='';
  showStartupAuth();
}

function renderSettings(el){el.innerHTML=`<div class="settingsGrid"><div class="settingCard"><div class="settingTitle"><span class="settingIcon">◉</span><div><h3>Student Profile</h3><p>Local profile used for records and future cloud sync.</p></div></div><input id="pname" value="${esc(D.profile.name)}" placeholder="Student name"><input id="pemail" value="${esc(D.profile.email)}" placeholder="Email"><input id="roll" type="number" min="1" max="100" value="${esc(D.profile.roll)}" placeholder="Roll number"><button class="settingSave" id="saveProfile">SAVE PROFILE</button></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">◐</span><div><h3>Theme</h3><p>Keep the v26-style adaptive appearance.</p></div></div><select id="theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">⏰</span><div><h3>Homework Reminder</h3><p>One-day-before reminder for saved homework.</p></div></div><label class="switchLine"><input id="oneDay" type="checkbox" ${D.settings.oneDayBefore?'checked':''}> One day before</label><button class="settingSave" id="reminderPage">MANAGE REMINDERS</button></div><div class="settingCard scheduleCard"><div class="settingTitle"><span class="settingIcon">▦</span><div><h3>Manage Schedule & Teachers</h3><p>Edit the preset timetable without changing historical daily records.</p></div></div><div class="scheduleToolbar"><div><label>Effective from</label><input id="effectiveDate" type="date" value="${iso(new Date())}"></div><button class="todayBtn" id="loadOriginal">Original</button></div><div id="scheduleEditor">${scheduleEditor(defaultSchedule())}</div><div class="scheduleExtraBox"><div><b>Copy schedule</b><small>Copy the current weekly schedule into a new effective-date version.</small></div><button class="addRow" id="copySchedule">COPY</button></div><button class="settingSave" id="tsave">SAVE SCHEDULE & TEACHERS</button></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">☁</span><div><h3>Firebase Cloud Account</h3><p>Sign in to sync your classwork, homework, syllabus, schedule and reminders across devices.</p></div></div>${cloudAccountMarkup()}<div class="twoCol"><button class="settingSave" id="exportData">EXPORT DATA</button><button class="settingSave" id="importData">IMPORT DATA</button></div><input id="importFile" type="file" accept="application/json" hidden></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">▣</span><div><h3>Administrator</h3><p>Restricted area. Login is required before the Admin Dashboard can be opened.</p></div></div><button class="settingSave" id="adminPage">ADMIN LOGIN</button></div></div>`;$('theme').value=D.theme;$('theme').onchange=()=>{D.theme=$('theme').value;setTheme();saveAll()};$('saveProfile').onclick=()=>{D.profile.name=$('pname').value.trim();D.profile.email=$('pemail').value.trim();D.profile.roll=$('roll').value;saveAll();toast('✓ Profile saved');show('today')};$('oneDay').onchange=e=>{D.settings.oneDayBefore=e.target.checked;saveAll()};$('reminderPage').onclick=()=>show('reminders');$('adminPage').onclick=()=>adminSession?show('admin'):showAdminLogin();$('loadOriginal').onclick=()=>{$('effectiveDate').value=iso(new Date());$('scheduleEditor').innerHTML=scheduleEditor(defaultSchedule());wireScheduleEditor()};$('effectiveDate').onchange=()=>{$('scheduleEditor').innerHTML=scheduleEditor(scheduleForDate(new Date($('effectiveDate').value+'T00:00:00')));wireScheduleEditor()};$('copySchedule').onclick=()=>{const date=$('effectiveDate').value;if(!date)return;D.changes=(D.changes||[]).filter(x=>x.date!==date);D.changes.push({date,schedule:collectSchedule()});D.changes.sort((a,b)=>a.date.localeCompare(b.date));saveAll();toast('✓ Schedule copied')};$('tsave').onclick=()=>{const date=$('effectiveDate').value,s=collectSchedule();if(!date||!Object.values(s).some(a=>a.length))return toast('Add at least one class');D.changes=(D.changes||[]).filter(x=>x.date!==date);D.changes.push({date,schedule:s});D.teachers=collectRowTeachers();saveAll();toast('✓ Schedule & teachers saved');show('today')};$('exportData').onclick=exportData;$('importData').onclick=()=>$('importFile').click();$('importFile').onchange=importData;
 if(cloudUser){$('cloudSyncNow').onclick=()=>syncCurrentUser('upload');$('cloudLogout').onclick=async()=>{try{clearTimeout(cloudSyncTimer);await syncCurrentUser('upload',true);await CloudAPI.signOut();try{localStorage.removeItem(STUDENT_SESSION_HINT)}catch(_){}toast('✓ Logged out of Firebase — your local data is kept on this device')}catch(e){toast('Could not log out')}}}
 else {$('cloudLogin').onclick=async()=>{const e=$('cloudEmail').value.trim(),p=$('cloudPassword').value;if(!e||!p)return toast('Enter email and password');await cloudSignIn(e,p)};$('cloudSignup').onclick=async()=>{const e=$('cloudEmail').value.trim(),p=$('cloudPassword').value;if(!e||!p)return toast('Enter email and password');await cloudSignUp(e,p)}}
 wireScheduleEditor()}
function timeOptions(selected){return '<option value="">Time</option>'+Array.from({length:48},(_,i)=>{const h=Math.floor(i/2),m=i%2?30:0,v=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');return `<option value="${v}" ${v===selected?'selected':''}>${formatTime(v)}</option>`}).join('')}
function formatTime(v){if(!v)return'';const[h,m]=v.split(':').map(Number),ap=h>=12?'PM':'AM',hh=h%12||12;return`${hh}:${String(m).padStart(2,'0')} ${ap}`}
function subjectOptions(selected){return [...SUBJECTS,'General Medicine (Evening)','General Surgery (Evening)','OBG (Evening)','Pediatrics (Evening)','Respiratory Medicine (Evening)','Orthopaedics (Evening)','Anaesthesiology (Evening)','Monthly Assessment (Evening)'].map(x=>`<option ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}
function scheduleEditor(schedule){return DAYS.map(day=>`<div class="daySchedule"><div class="scheduleDayHead"><div class="scheduleDay">${day}</div><button class="addRow" data-add="${day}">＋ Add class</button></div><div class="scheduleHeader"><span>START</span><span>END</span><span>SUBJECT</span><span>TEACHER</span><span></span></div><div class="scheduleRows" data-day="${day}">${(schedule[day]||[]).map((x,i)=>scheduleRow(day,i,x)).join('')}</div></div>`).join('')}
function scheduleRow(day,i,x){const subject=x[2],teacher=D.teachers[subject]||'';return `<div class="scheduleRow"><select class="from">${timeOptions(x[0])}</select><select class="to">${timeOptions(x[1])}</select><select class="subj">${subjectOptions(subject)}</select><input class="rowTeacher" value="${esc(teacher)}" placeholder="Teacher name"><button class="removeRow">×</button></div>`}
function collectSchedule(){const s={};document.querySelectorAll('.scheduleRows').forEach(box=>s[box.dataset.day]=Array.from(box.querySelectorAll('.scheduleRow')).map(r=>[r.querySelector('.from').value,r.querySelector('.to').value,r.querySelector('.subj').value]).filter(x=>x[0]&&x[1]&&x[2]));return s}
function collectRowTeachers(){const out={...D.teachers};document.querySelectorAll('.scheduleRow').forEach(r=>{const s=r.querySelector('.subj').value,t=r.querySelector('.rowTeacher').value.trim();if(s&&t)out[s]=t});return out}
function wireScheduleEditor(){document.querySelectorAll('.addRow[data-add]').forEach(b=>b.onclick=()=>{const box=document.querySelector(`.scheduleRows[data-day="${CSS.escape(b.dataset.add)}"]`);box.insertAdjacentHTML('beforeend',scheduleRow(b.dataset.add,box.children.length,['09:00','10:00','General Medicine']));wireScheduleEditor()});document.querySelectorAll('.removeRow').forEach(b=>b.onclick=()=>b.closest('.scheduleRow').remove());document.querySelectorAll('.scheduleRow .subj').forEach(s=>s.onchange=()=>{const i=s.closest('.scheduleRow').querySelector('.rowTeacher');i.value=D.teachers[s.value]||''})}
function adminPanel(title,icon,body,id){return `<section class="adminPanel" id="${id||''}"><div class="adminPanelHead"><div class="adminPanelIcon">${icon}</div><div><h3>${title}</h3></div></div><div class="adminPanelBody">${body}</div></section>`}
function renderAdmin(el){
  if(!adminSession)return showAdminLogin();
  const records=Object.entries(D.records||{}), hw=homeworkEntries(), topics=syllabusData();
  const pending=hw.filter(x=>!x.r.completed).length, completed=hw.length-pending;
  const students=Array.isArray(D.admin?.students)?D.admin.students:[];
  const notices=Array.isArray(D.admin?.announcements)?D.admin.announcements:[];
  const teacherList=Object.entries(D.teachers||{});
  const syllabusSubjects=Object.keys(topics);
  const cloud=D.admin?.cloud||{};
  const ai=D.admin?.ai||{};
  const ads=D.admin?.ads||{};
  const appcfg=D.admin?.app||{};
  const security=D.admin?.security||{};
  const feature=(key,label,val=true)=>`<label class="adminSwitch"><input type="checkbox" data-admin-setting="${key}" ${val?'checked':''}><span>${label}</span></label>`;
  el.innerHTML=`
  <div class="sectionHead adminHead"><div><div class="eyebrow">ADMINISTRATOR ONLY</div><h2>Admin Dashboard</h2><p class="mutedIntro">All privileged controls are contained here and require administrator login.</p></div><button class="logoutBtn" id="adminLogout">ADMIN LOGOUT</button></div>
  <div class="adminStatsGrid">
    <div class="adminStat"><span>Students</span><strong>${students.length||1}</strong><small>${students.length?'Registered profiles':'Local prototype profile'}</small></div>
    <div class="adminStat"><span>Classwork</span><strong>${records.length}</strong><small>Saved daily records</small></div>
    <div class="adminStat"><span>Homework</span><strong>${hw.length}</strong><small>${pending} pending · ${completed} completed</small></div>
    <div class="adminStat"><span>Syllabus</span><strong>${Object.values(topics).flat().length}</strong><small>${syllabusSubjects.length} subjects with records</small></div>
  </div>
  <div class="adminGrid">
  ${adminPanel('Overview','⌂',`<div class="adminTwo"><div><b>Current student</b><p>${esc(D.profile.name||'Not set')} · ${esc(D.profile.email||'No email')}</p></div><div><b>Last saved</b><p>${D._savedAt?new Date(D._savedAt).toLocaleString():'Not available'}</p></div></div><div class="adminQuick"><button class="settingSave" data-scroll="studentsPanel">STUDENTS</button><button class="settingSave" data-scroll="syllabusPanel">SYLLABUS</button><button class="settingSave" data-scroll="schedulePanel">SCHEDULE</button><button class="settingSave" data-scroll="aiPanel">GEMINI AI</button></div>`,'overviewPanel')}
  ${adminPanel('Student Management','👨‍🎓',`<div class="adminToolbar"><input id="adminStudentSearch" placeholder="Search name or roll number"><button class="addRow" id="addStudent">＋ ADD LOCAL PROFILE</button></div><div id="studentList">Loading cloud students…</div><div id="studentCloudDetail" class="cloudStudentDetail"></div><p class="adminNote">When Firebase is connected, this area shows cloud student accounts and their saved classwork, homework and syllabus directly inside the app. Local profiles remain separate from cloud accounts.</p>`,'studentsPanel')}
  ${adminPanel('Classwork Monitoring','📚',`<div class="filterBar"><select id="adminSubjectFilter"><option value="">All subjects</option>${SUBJECTS.map(s=>`<option>${esc(s)}</option>`).join('')}</select><input id="adminDateFilter" type="date"></div><div id="adminClassworkList">${records.slice().reverse().slice(0,100).map(([k,r])=>{const m=recordMeta(k);return `<div class="adminRecord"><b>${esc(m.subject)}</b><span>${esc(m.date)} · ${esc(m.time)}</span><p><strong>Chapter:</strong> ${esc(r.chapter||'—')} · <strong>Topic:</strong> ${esc(r.topic||'—')}</p><small>Teacher: ${esc(r.teacher||'—')}</small></div>`}).join('')||'<div class="empty glass">No classwork records yet.</div>'}</div>`,'classworkPanel')}
  ${adminPanel('Homework Monitoring','📝',`<div class="filterBar"><select id="adminHomeworkFilter"><option value="">All</option><option value="pending">Pending</option><option value="completed">Completed</option></select><input id="adminHomeworkDate" type="date"></div><div id="adminHomeworkList">${hw.slice().reverse().map(x=>`<div class="adminRecord"><b>${esc(x.m.subject)}</b><span>${esc(x.m.date)} · ${esc(x.m.time)}</span><p>${esc(x.r.homework)}</p><small>${x.r.completed?'✓ Completed':'○ Pending'} · Due/reminder data stored with record</small></div>`).join('')||'<div class="empty glass">No homework records yet.</div>'}</div>`,'homeworkPanel')}
  ${adminPanel('Syllabus Management','📖',`<div class="adminToolbar"><input id="adminSyllabusSubject" placeholder="Subject name"><input id="adminChapter" placeholder="Chapter"><input id="adminTopic" placeholder="Topic"><button class="addRow" id="addSyllabus">＋ ADD</button></div><div class="adminList">${syllabusSubjects.length?syllabusSubjects.map(s=>`<div class="adminRecord"><b>${esc(s)}</b><small>${topics[s].length} recorded topic(s)</small><p>${topics[s].slice(-5).map(t=>`${esc(t.chapter||'No chapter')}: ${esc(t.topic)}`).join(' · ')}</p></div>`).join(''):'<div class="empty glass">No syllabus records yet.</div>'}</div><div class="adminQuick"><button class="settingSave" id="publishSyllabus">PUBLISH SYLLABUS</button><button class="settingSave" id="restoreSyllabus">RESTORE FROM RECORDS</button></div>`,'syllabusPanel')}
  ${adminPanel('Teacher Management','👨‍🏫',`<div class="adminToolbar"><input id="adminTeacherSubject" placeholder="Subject"><input id="adminTeacherName" placeholder="Teacher name"><button class="addRow" id="addTeacher">＋ ADD / UPDATE</button></div><div class="adminList">${teacherList.length?teacherList.map(([s,t])=>`<div class="adminListRow"><div><b>${esc(s)}</b><small>${esc(t)}</small></div><button class="dangerBtn" data-delete-teacher="${esc(s)}">DELETE</button></div>`).join(''):'<div class="empty glass">No default teachers configured.</div>'}</div>`,'teachersPanel')}
  ${adminPanel('Master Schedule','🗓️',`<p class="adminNote">Admin controls for the official timetable, effective-date versions, clinical posting groups and special rotations.</p><div class="adminScheduleSummary">${DAYS.map(d=>`<div><b>${d}</b><span>${(scheduleForDate(new Date()) [d]||[]).length} classes</span></div>`).join('')}</div><div class="adminToolbar"><input id="adminScheduleDate" type="date" value="${iso(new Date())}"><button class="settingSave" id="adminScheduleCopy">COPY CURRENT SCHEDULE</button><button class="settingSave" id="adminScheduleOriginal">RESTORE ORIGINAL</button></div><p class="adminNote">Clinical Posting remains roll-group based. Schedule changes do not rewrite historical daily records.</p>`,'schedulePanel')}
  ${adminPanel('Announcements','📢',`<textarea id="announcementText" rows="3" placeholder="Write an announcement for students..."></textarea><div class="adminToolbar"><select id="announcementAudience"><option>Everyone</option><option>Selected roll group</option><option>Selected student</option></select><button class="settingSave" id="publishAnnouncement">PUBLISH</button></div><div class="adminList">${notices.slice().reverse().map(n=>`<div class="adminRecord"><b>${esc(n.text)}</b><small>${esc(n.audience||'Everyone')} · ${esc(n.date||'')}</small></div>`).join('')||'<div class="empty glass">No announcements.</div>'}</div>`,'announcementsPanel')}
  ${adminPanel('Notification Management','🔔',`${feature('notifications.homework','Homework reminders',true)}${feature('notifications.oneDay','One-day-before reminders',true)}${feature('notifications.due','Due-date reminders',true)}${feature('notifications.schedule','Schedule changes',true)}${feature('notifications.syllabus','New syllabus',true)}${feature('notifications.important','Important announcements',true)}<p class="adminNote">Students retain control over personal notification permission and reminder preferences.</p>`,'notificationsPanel')}
  ${adminPanel('Gemini AI Configuration','✦',`<p class="adminNote">Gemini configuration is ADMIN ONLY. Never expose the API key in Student Settings.</p><input id="adminGeminiKey" type="password" value="${esc(D.admin?.geminiKey||'')}" placeholder="Gemini API key"><div class="adminToolbar"><select id="adminGeminiModel"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="gemini-2.5-pro">Gemini 2.5 Pro</option></select><button class="settingSave" id="saveAdminGemini">SAVE AI CONFIGURATION</button></div><div class="adminFeatureGrid">${feature('ai.syllabus','Understand syllabus',ai.syllabus!==false)}${feature('ai.classwork','Understand classwork',ai.classwork!==false)}${feature('ai.homework','Understand homework',ai.homework!==false)}${feature('ai.revision','Create revision plans',ai.revision!==false)}${feature('ai.consolidate','Consolidate syllabus',ai.consolidate!==false)}${feature('ai.questions','Answer academic questions',ai.questions!==false)}</div>`,'aiPanel')}
  ${adminPanel('Analytics','📊',`<div class="analyticsBars"><div><span>Homework completion</span><b>${hw.length?Math.round(completed/hw.length*100):0}%</b></div><div><span>Records with topic</span><b>${records.length?Math.round(records.filter(([,r])=>r.topic).length/records.length*100):0}%</b></div><div><span>Records with chapter</span><b>${records.length?Math.round(records.filter(([,r])=>r.chapter).length/records.length*100):0}%</b></div></div><p class="adminNote">Analytics are calculated locally in this prototype. Cloud-wide analytics will be available after synchronization is enabled.</p>`,'analyticsPanel')}
  ${adminPanel('Cloud & Synchronization','☁️',`<p class="adminNote">Firebase is connected to this build. Student cloud sync uses the signed-in account; admin-wide access is protected by the admins collection and Firestore Rules.</p>${feature('cloud.enabled','Enable cloud sync',cloud.enabled===true)}${feature('cloud.backup','Automatic backup',cloud.backup!==false)}${feature('cloud.force','Allow force synchronization',cloud.force!==false)}<div class="adminToolbar"><button class="settingSave" id="cloudTest">TEST CLOUD CONNECTION</button><button class="settingSave" id="cloudBackup">BACKUP LOCAL DATA</button><button class="settingSave" id="cloudRestore">RESTORE BACKUP</button></div><p id="cloudStatus" class="statusPill">Status: ${adminUser?'Admin connected to Firebase':(cloudUser?'Student connected to Firebase':'Not signed in')}</p>`,'cloudPanel')}
  ${adminPanel('Backup & Export','💾',`<div class="adminQuick"><button class="settingSave" id="adminExport">EXPORT ALL DATA</button><button class="settingSave" id="adminExportRecords">EXPORT RECORDS CSV</button><button class="settingSave" id="adminExportPdf">EXPORT RECORDS PDF</button></div><p class="adminNote">Exports contain the locally available student data.</p>`,'backupPanel')}
  ${adminPanel('App Management','📱',`<div class="adminFeatureGrid">${feature('app.gemini','Gemini AI',appcfg.gemini!==false)}${feature('app.homework','Homework',appcfg.homework!==false)}${feature('app.reminders','Reminders',appcfg.reminders!==false)}${feature('app.syllabus','Syllabus',appcfg.syllabus!==false)}${feature('app.sharing','Friend sharing',appcfg.sharing!==false)}${feature('app.maintenance','Maintenance mode',appcfg.maintenance===true)}</div><label>Minimum supported app version<input id="minVersion" value="${esc(appcfg.minVersion||'1.0.0')}"></label><button class="settingSave" id="saveAppConfig">SAVE APP CONFIGURATION</button>`,'appPanel')}
  ${adminPanel('Ads Management','💰',`<div class="adminFeatureGrid">${feature('ads.enabled','Ads enabled',ads.enabled===true)}${feature('ads.banner','Banner ads',ads.banner!==false)}${feature('ads.interstitial','Interstitial ads',ads.interstitial===true)}</div><label>Interstitial frequency<input id="adFrequency" type="number" min="1" value="${Number(ads.frequency||5)}"></label><button class="settingSave" id="saveAds">SAVE ADS CONFIGURATION</button><p class="adminNote">No ad network is connected in this local build.</p>`,'adsPanel')}
  ${adminPanel('Security & Admin Accounts','🔐',`<p class="adminNote">Prototype admin login is local-only. Replace it with server-side authentication before production.</p><div class="adminTwo"><label>Admin username<input id="adminUsername" value="${esc(security.username||'Firebase Admin')}"></label><label>New password<input id="adminPassword" type="password" placeholder="Enter new password"></label></div><button class="settingSave" id="saveAdminSecurity">SAVE SECURITY SETTINGS</button><button class="dangerBtn" id="adminLogout2">LOG OUT ALL LOCAL ADMIN SESSIONS</button>`,'securityPanel')}
  </div>`;
  const setPath=(path,val)=>{let o=D.admin||{};const parts=path.split('.');for(let i=0;i<parts.length-1;i++){o[parts[i]]=o[parts[i]]||{};o=o[parts[i]]}o[parts.at(-1)]=val;D.admin=o;saveAll()};
  document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'}));
  document.querySelectorAll('[data-admin-setting]').forEach(x=>x.onchange=()=>setPath(x.dataset.adminSetting,x.checked));
  $('adminLogout').onclick=async()=>{try{await CloudAPI.adminSignOut()}catch(e){} adminUser=null;adminSession=false;toast('Admin logged out');if(cloudUser)show('today');else showStartupAuth()};
  $('adminLogout2').onclick=async()=>{try{await CloudAPI.adminSignOut()}catch(e){} adminUser=null;adminSession=false;toast('Admin session closed');if(cloudUser)show('today');else showStartupAuth()};
  $('saveAdminGemini').onclick=()=>{D.admin=D.admin||{};D.admin.geminiKey=$('adminGeminiKey').value.trim();D.admin.ai=D.admin.ai||{};D.admin.ai.model=$('adminGeminiModel').value;saveAll();toast('✓ Gemini configuration saved')};
  $('addTeacher').onclick=()=>{const s=$('adminTeacherSubject').value.trim(),t=$('adminTeacherName').value.trim();if(!s||!t)return toast('Enter subject and teacher');D.teachers[s]=t;saveAll();renderAdmin(el);toast('✓ Teacher saved')};
  document.querySelectorAll('[data-delete-teacher]').forEach(b=>b.onclick=()=>{delete D.teachers[b.dataset.deleteTeacher];saveAll();renderAdmin(el);toast('Teacher removed')});
  $('addSyllabus').onclick=()=>{const s=$('adminSyllabusSubject').value.trim(),c=$('adminChapter').value.trim(),t=$('adminTopic').value.trim();if(!s||!t)return toast('Enter subject and topic');D.syllabus=D.syllabus||{};D.syllabus[s]=D.syllabus[s]||[];D.syllabus[s].push({chapter:c,topic:t,date:iso(new Date()),teacher:D.teachers[s]||''});saveAll();renderAdmin(el);toast('✓ Syllabus topic added')};
  $('publishSyllabus').onclick=()=>toast('✓ Syllabus marked as published locally');$('restoreSyllabus').onclick=()=>{D.syllabus=clone(topics);saveAll();toast('✓ Syllabus rebuilt from records');renderAdmin(el)};
  $('addStudent').onclick=()=>{D.admin.students=D.admin.students||[];D.admin.students.push({name:'New Student',email:'',roll:'',active:true});saveAll();renderAdmin(el);toast('✓ Local profile added')};
  loadAdminCloudData(el);
  $('publishAnnouncement').onclick=()=>{const text=$('announcementText').value.trim();if(!text)return toast('Write an announcement');D.admin.announcements=D.admin.announcements||[];D.admin.announcements.push({text,audience:$('announcementAudience').value,date:iso(new Date())});saveAll();renderAdmin(el);toast('✓ Announcement published')};
  $('adminScheduleCopy').onclick=()=>{const date=$('adminScheduleDate').value||iso(new Date());D.changes=(D.changes||[]).filter(x=>x.date!==date);D.changes.push({date,schedule:clone(scheduleForDate(new Date()))});saveAll();toast('✓ Schedule version saved')};
  $('adminScheduleOriginal').onclick=()=>{D.schedule=defaultSchedule();saveAll();toast('✓ Original schedule restored');renderAdmin(el)};
  $('cloudTest').onclick=async()=>{if(adminUser){try{await CloudAPI.getAllStudents();toast('✓ Firebase admin connection is working')}catch(e){toast('Firebase admin connection failed — check Rules')}}else if(cloudUser){try{await CloudAPI.getUserData(cloudUser.uid);toast('✓ Firebase connection is working')}catch(e){toast('Firebase connection failed — check Rules')}}else toast('Sign in to a Firebase account first')};$('cloudBackup').onclick=()=>cloudUser?syncCurrentUser('upload'):exportData;$('cloudRestore').onclick=()=>cloudUser?syncCurrentUser('download'):toast('Sign in to a student Firebase account to restore cloud data');
  $('adminExport').onclick=exportData;
  $('adminExportRecords').onclick=()=>{const rows=[['Subject','Date','Time','Chapter','Topic','Homework','Teacher']];records.forEach(([k,r])=>{const m=recordMeta(k);rows.push([m.subject,m.date,m.time,r.chapter||'',r.topic||'',r.homework||'',r.teacher||''])});const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='classwork-planner-records.csv';a.click();toast('✓ CSV exported')};
  $('adminExportPdf').onclick=()=>{
    const rows=records.map(([k,r])=>{const m=recordMeta(k);return `<tr><td>${esc(m.subject)}</td><td>${esc(m.date)}</td><td>${esc(m.time)}</td><td>${esc(r.chapter||'')}</td><td>${esc(r.topic||'')}</td><td>${esc(r.homework||'')}</td><td>${esc(r.teacher||'')}</td></tr>`}).join('');
    const w=window.open('','_blank');
    if(!w){toast('Allow pop-ups for this app to print.');return;}
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Classwork Planner Records</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:7px;text-align:left}th{background:#eee}@media print{body{padding:0}table{font-size:10px}}</style></head><body><h1>Classwork Planner Records</h1><table><thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Chapter</th><th>Topic</th><th>Homework</th><th>Teacher</th></tr></thead><tbody>${rows||'<tr><td colspan="7">No records.</td></tr>'}</tbody></table><script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)};window.onafterprint=function(){setTimeout(function(){window.close()},200)};<\/script></body></html>`);
    w.document.close();
  };

  $('saveAppConfig').onclick=()=>{D.admin.app=D.admin.app||{};D.admin.app.minVersion=$('minVersion').value.trim();saveAll();toast('✓ App configuration saved')};
  $('saveAds').onclick=()=>{D.admin.ads=D.admin.ads||{};D.admin.ads.frequency=Number($('adFrequency').value)||5;saveAll();toast('✓ Ads configuration saved')};
  $('saveAdminSecurity').onclick=()=>{D.admin.security=D.admin.security||{};D.admin.security.username=$('adminUsername').value.trim()||'Firebase Admin';if($('adminPassword').value)toast('Password change is stored only after server authentication is added');saveAll();toast('✓ Security settings saved')};
}

function exportData(){const blob=new Blob([JSON.stringify(D,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='classwork-planner-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('✓ Data exported')}
function importData(e){const f=e.target.files?.[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const x=JSON.parse(rd.result);D={...D,...x,profile:{...D.profile,...(x.profile||{})}};saveAll();setTheme();toast('✓ Data imported');show('today')}catch{toast('Invalid data file')}};rd.readAsText(f)}
function confirmBox(title,text){return new Promise(resolve=>{const m=$('confirmModal');$('confirmTitle').textContent=title;$('confirmText').textContent=text;m.classList.add('show');const ok=()=>{cleanup();resolve(true)},no=()=>{cleanup();resolve(false)},cleanup=()=>{m.classList.remove('show');$('confirmYes').removeEventListener('click',ok);$('confirmNo').removeEventListener('click',no)};$('confirmYes').addEventListener('click',ok);$('confirmNo').addEventListener('click',no)})}
function resetAtMidnight(){clearTimeout(midnightTimer);const now=new Date(),next=new Date(now);next.setHours(24,0,1,0);midnightTimer=setTimeout(()=>{today=startOfDay(new Date());show('today');resetAtMidnight()},next-now)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.page));
loadLocal();setTheme();resetAtMidnight();show('today');scheduleNextReminder();
// Show the student login immediately for first-time/cleared-data launches.
// If Firebase restores an existing student session, the auth callback below closes it.
// The startup login overlay is present in index.html immediately, so AppGeyser/WebView
// cannot briefly render the main app without the login gate. Firebase auth callbacks
// close it automatically when a persisted student/admin session is restored.
try{showStartupAuth()}catch(_){showStartupAuth()}
CloudAPI.onAuthStateChanged(async user=>{
  cloudUser=user||null;
  if(user){try{localStorage.setItem(STUDENT_SESSION_HINT,'1')}catch(_){} closeStartupAuth();}
  if(user){
    D.profile.email=user.email||D.profile.email;
    saveAll();
    if(!adminSession&&!adminAuthInProgress){
      show('today');
      // Restore cloud before uploads after an app restart.
      try{await CloudAPI.setPersistence();await syncCurrentUser('download',true);}
      catch(e){console.warn('Initial cloud restore failed',e)}
      startAutomaticCloudSync();
      show('today');
    }
  }else{
    stopAutomaticCloudSync();
    if(!adminUser&&!adminAuthInProgress){try{localStorage.removeItem(STUDENT_SESSION_HINT)}catch(_){} showStartupAuth();}
    if($('settings'))show('settings');
  }
});
CloudAPI.onAdminAuthStateChanged(async user=>{
  adminUser=user||null;
  if(user&&!adminAuthInProgress){
    try{
      const allowed=await CloudAPI.isAdmin(user.uid);
      if(allowed){
        adminSession=true;
        closeStartupAuth();
        show('admin');
        return;
      }
      await CloudAPI.adminSignOut();
    }catch(e){console.warn('Admin session verification failed',e)}
  }
  if(!user){
    adminSession=false;
    if(!cloudUser)showStartupAuth();
  }
});
window.addEventListener('online',()=>{toast('Back online — syncing…');if(cloudUser)syncCurrentUser('upload',true)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cloudUser){startAutomaticCloudSync();syncCurrentUser('upload',true)}});
window.addEventListener('pagehide',()=>{if(cloudUser&&!suppressCloudQueue)syncCurrentUser('upload',true)});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
