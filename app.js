import { CloudAPI, GeminiAPI } from "./firebase.js";

let cloudUser=null;
let adminUser=null;
let cloudBusy=false;
let cloudStudents=[];
let suppressCloudQueue=false;
let cloudSyncTimer=null;
let cloudIntervalTimer=null;
const CLOUD_SYNC_INTERVAL=60*1000;
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
["Pediatrics","ENT","Respiratory Medicine","G.Medicine","General Surgery","OBG"],["Pediatrics","ENT","Psychiatry","G.Medicine","General Surgery","OBG"],["Orthopaedics","EYE","Dermatology","G.Medicine","General Surgery","OBG"],["Orthopaedics","EYE","Anaesthesiology (ICU)","G.Medicine","General Surgery","OBG"],
["Orthopaedics","EYE","Dermatology","G.Medicine","General Surgery","OBG"],
["Orthopaedics","EYE","Dermatology","G.Medicine","General Surgery","OBG"],
["Orthopaedics","EYE","Anaesthesiology (ICU)","G.Medicine","General Surgery","OBG"],
["Orthopaedics","EYE","Anaesthesiology (ICU)","G.Medicine","General Surgery","OBG"]
];
const NEW = [["General Surgery","OBG","Radiodiagnosis","Emergency Medicine"],["General Surgery","OBG","Radiodiagnosis","Emergency Medicine"],["Emergency Medicine","Radiodiagnosis","OBG","General Surgery"],["Emergency Medicine","Radiodiagnosis","OBG","General Surgery"],["G.Medicine","ENT","Emergency Medicine","Radiodiagnosis"],["G.Medicine","ENT","Emergency Medicine","Radiodiagnosis"],["Radiodiagnosis","Emergency Medicine","ENT","G.Medicine"],["Radiodiagnosis","Emergency Medicine","ENT","G.Medicine"]];
const APP_START_DATE = new Date(2026,8,7);
const START = new Date(2026,8,7), SWITCH = new Date(2027,7,9);



const STORAGE='cwp-local-v30';
const STUDENT_SESSION_HINT='cwp-student-session-present';
// Administrator access is controlled by Firebase Authentication + Firestore admin allow-list.
let adminSession=false;
let adminAuthInProgress=false;
// Admin-only controls are never rendered in student screens. Admin session exists only in memory.

let D={profile:{name:'',email:'',roll:''},teachers:{},records:{},extras:[],changes:[],theme:'system',schedule:null,reminders:[],syllabus:{},admin:{},settings:{reminderEnabled:true,oneDayBefore:true,reminderLead:60,lastSyncAt:0},_savedAt:0};
let today=startOfDay(new Date());
let midnightTimer=null;
const $=id=>document.getElementById(id); const clone=x=>JSON.parse(JSON.stringify(x));
// Keep the PWA/app-like viewport fixed at 100% and block browser pinch/double zoom.
document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
document.addEventListener('gestureend',e=>e.preventDefault(),{passive:false});
let __lastTouchEnd=0;
document.addEventListener('touchend',e=>{const now=Date.now();if(now-__lastTouchEnd<300)e.preventDefault();__lastTouchEnd=now},{passive:false});

function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function iso(d){const x=startOfDay(d);const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function fmt(d){return d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)}
function saveAll(){try{D._savedAt=Date.now();localStorage.setItem(STORAGE,JSON.stringify(D));if(cloudUser&&!suppressCloudQueue){clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>syncCurrentUser('upload',true),CLOUD_SAVE_DEBOUNCE)}return true}catch(e){toast('Device storage is unavailable');return false}}
function loadLocal(){try{const raw=localStorage.getItem(STORAGE);if(raw){const L=JSON.parse(raw)||{};D={...D,...L,profile:{...D.profile,...(L.profile||{})},records:{...D.records,...(L.records||{})},teachers:{...D.teachers,...(L.teachers||{})},admin:{...D.admin,...(L.admin||{})},settings:{...D.settings,...(L.settings||{})},extras:Array.isArray(L.extras)?L.extras:[],changes:Array.isArray(L.changes)?L.changes:[],reminders:Array.isArray(L.reminders)?L.reminders:[],syllabus:L.syllabus||{}};if(D.admin&&'geminiKey' in D.admin)delete D.admin.geminiKey}}catch(e){console.warn(e)} D.schedule=normalizeSchedule(D.schedule)}
function defaultSchedule(){return clone(WEEK)}
function normalizeSchedule(s){const out=defaultSchedule();if(!s)return out;DAYS.forEach(day=>{if(Array.isArray(s[day]))out[day]=s[day].map(x=>[x[0],x[1],x[2]]).filter(x=>x[0]&&x[1]&&x[2])});return out}
function scheduleForDate(d){let result=normalizeSchedule(D.schedule);const target=iso(d);const changes=(D.changes||[]).filter(x=>x&&x.date&&x.date<=target).sort((a,b)=>a.date.localeCompare(b.date));if(changes.length){const c=normalizeSchedule(changes.at(-1).schedule);if(DAYS.some(day=>c[day]?.length))result=c}return result}
function clinical(d){let r=+D.profile.roll;if(!(r>=1&&r<=100))return'Clinical Posting';let m=startOfDay(d);m.setDate(m.getDate()-((m.getDay()+6)%7));let arr=d<SWITCH?OLD:NEW,st=d<SWITCH?START:SWITCH,w=Math.floor((m-st)/604800000),g=d<SWITCH?(r<=16?0:r<=32?1:r<=49?2:r<=66?3:r<=83?4:5):(r<=25?0:r<=50?1:r<=75?2:3);return arr[w]?.[g]||'Clinical Posting'}
function displaySubject(s,d){if(s!=='Clinical Posting')return s;const dept=clinical(d);return dept==='Clinical Posting'?'Clinical Posting':`${dept} (Clinical Posting)`}
function recKey(c,d=today){return iso(d)+'|'+c.time+'|'+c.subject+'|'+(c.scheduledSubject||'')}
function legacyRecKey(c,d=today){return iso(d)+'|'+c.subject+'|'+(c.teacher||D.teachers[c.scheduledSubject]||'')}
function recordForClass(c){return D.records[recKey(c)]||D.records[legacyRecKey(c)]||{}}
function weekdayOccurrenceInMonth(d){return Math.floor((d.getDate()-1)/7)+1}
function daysInMonth(year,monthIndex){return new Date(year,monthIndex+1,0).getDate()}
function specialEveningSubject(d,start){
  const occurrence=weekdayOccurrenceInMonth(d);
  const lastDay=daysInMonth(d.getFullYear(),d.getMonth());
  const hasFifthOccurrence=occurrence===5 && (d.getDate()+7)<=lastDay;
  // The timetable uses the actual 1st/2nd/3rd/4th/5th occurrence of the
  // weekday in the calendar month. A fifth rotation exists only when that
  // weekday actually occurs five times in that month.
  if(d.getDay()===4){
    if(start==='15:00')return occurrence<=2?'Respiratory Medicine':'Radiodiagnosis';
    if(start==='16:00')return occurrence<=2?'Pediatrics':'Anaesthesiology';
  }
  if(d.getDay()===5){
    if(start==='15:00')return occurrence<=2?'Orthopaedics':'OBG';
    if(start==='16:00')return 'General Medicine';
  }
  return null;
}
function classesForDate(d){const day=d.toLocaleDateString('en-US',{weekday:'long'}),s=scheduleForDate(d);const base=(s[day]||[]).map(x=>{let subject=displaySubject(x[2],d);const special=specialEveningSubject(d,x[0]);if(special && /\(Evening\)$/.test(x[2]))subject=special;return {time:x[0]+'–'+x[1],subject,scheduledSubject:x[2],teacher:D.teachers[x[2]]||D.teachers[subject]||''}});const extras=(D.extras||[]).filter(x=>x.date===iso(d)).map(x=>({time:x.time,subject:x.subject,scheduledSubject:x.subject,teacher:x.teacher||'',extra:true,id:x.id}));return base.concat(extras)}
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
async function cloudSignIn(email,password,name='',roll=''){
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
    if(name.trim())D.profile.name=name.trim();
    if(String(roll).trim())D.profile.roll=String(roll).trim();
    saveAll();
    await syncCurrentUser('upload',true);
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
async function resetStudentPassword(email){
  if(!email)return toast('Enter your student email first');
  try{await CloudAPI.resetPassword(email);toast('✓ Reset email requested\nCheck Inbox/Spam for the Firebase password-reset email.');return true}
  catch(e){console.error(e);toast(({
    'EMAIL_NOT_FOUND':'No Firebase account was found for this email.',
    'INVALID_EMAIL':'Enter a valid email address.',
    'TOO_MANY_ATTEMPTS_TRY_LATER':'Too many attempts. Try again later.'
  }[e?.code])||'Could not send password reset email.');return false}
}
async function resetAdminPassword(email){
  if(!email)return toast('Enter your admin email first');
  try{await CloudAPI.adminResetPassword(email);toast('✓ Reset email requested\nCheck Inbox/Spam for the Firebase password-reset email.');return true}
  catch(e){console.error(e);toast(({
    'EMAIL_NOT_FOUND':'No Firebase account was found for this email.',
    'INVALID_EMAIL':'Enter a valid email address.',
    'TOO_MANY_ATTEMPTS_TRY_LATER':'Too many attempts. Try again later.'
  }[e?.code])||'Could not send password reset email.');return false}
}
function cloudAccountMarkup(){
  if(cloudUser){const ls=D.settings?.lastSyncAt?`Last synced: ${new Date(D.settings.lastSyncAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}`:'Last synced: Not yet';return `<div class="cloudAccount"><div><b>✓ Signed in</b><small>${esc(cloudUser.email||'')}</small></div><div class="twoCol"><button class="settingSave" id="cloudSyncNow">SYNC NOW</button><button class="settingSave" id="cloudLogout">LOG OUT</button></div><p class="statusPill" id="cloudAccountStatus">${esc(ls)}</p></div>`;}
  return `<div class="cloudAccount"><label>Name</label><input id="cloudName" type="text" autocomplete="name" placeholder="Student name"><label>Roll number</label><input id="cloudRoll" type="number" min="1" max="100" inputmode="numeric" placeholder="Roll number (1–100)"><label>Email</label><input id="cloudEmail" type="email" autocomplete="email" placeholder="Student email"><label>Password</label><input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Password (6+ characters)"><div class="twoCol"><button class="settingSave" id="cloudLogin">LOGIN</button><button class="settingSave" id="cloudSignup">CREATE ACCOUNT</button></div><button class="authForgotLink" id="cloudForgot">Forgot password?</button><p class="statusPill">Not signed in — local data remains on this device</p></div>`;
}
function adminFilterMarkup(prefix, status=false){
  return `<div class="adminFilterGrid" data-filter-prefix="${prefix}">
    <select id="${prefix}Name"><option value="">All students</option></select>
    <select id="${prefix}Roll"><option value="">All roll numbers</option></select>
    <select id="${prefix}Email"><option value="">All emails</option></select>
    <div class="adminDateRange"><label>From date</label><input id="${prefix}DateFrom" type="date" min="${iso(APP_START_DATE)}"></div>
    <div class="adminDateRange"><label>To date</label><input id="${prefix}DateTo" type="date" min="${iso(APP_START_DATE)}"></div>
    <select id="${prefix}Subject"><option value="">All subjects</option></select>
    <select id="${prefix}Teacher"><option value="">All teachers</option></select>
    ${status?`<select id="${prefix}Status"><option value="">All homework</option><option value="pending">Pending</option><option value="completed">Completed</option></select>`:''}
    <button class="settingSave" id="${prefix}Export">EXPORT FILTERED PDF</button>
    <button class="dangerBtn adminDeleteFilterBtn" id="${prefix}Delete">DELETE FILTERED FIREBASE DATA</button>
    <div class="adminFilterHint">Date range is inclusive. Leave both dates empty for <b>All dates</b>; use the same date in both boxes for one day.</div>
  </div>`;
}
function uniqueSorted(values){return [...new Set(values.filter(v=>String(v||'').trim()).map(String))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}))}
function populateAdminFilter(prefix){
  const a=cloudAggregate(), rs=a.rows, ss=a.syllabus;
  const opts={
    Name:['All students',uniqueSorted([...rs.map(x=>x.studentName),...ss.map(x=>x.studentName)])],
    Roll:['All roll numbers',uniqueSorted([...rs.map(x=>x.roll),...ss.map(x=>x.roll)])],
    Email:['All emails',uniqueSorted([...rs.map(x=>x.email),...ss.map(x=>x.email)])],
    Subject:['All subjects',uniqueSorted([...rs.map(x=>x.meta.subject),...ss.map(x=>x.subject)])],
    Teacher:['All teachers',uniqueSorted([...rs.map(x=>x.record.teacher),...ss.map(x=>x.teacher)])]
  };
  Object.entries(opts).forEach(([key,[all,vals]])=>{const sel=$(`${prefix}${key}`);if(!sel)return;const current=sel.value;sel.innerHTML=`<option value="">${all}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(current))sel.value=current});
}
function readAdminFilters(prefix){return {name:$(`${prefix}Name`)?.value||'',roll:$(`${prefix}Roll`)?.value||'',email:$(`${prefix}Email`)?.value||'',dateFrom:$(`${prefix}DateFrom`)?.value||'',dateTo:$(`${prefix}DateTo`)?.value||'',subject:$(`${prefix}Subject`)?.value||'',teacher:$(`${prefix}Teacher`)?.value||'',status:$(`${prefix}Status`)?.value||''}}
function dateMatchesRange(date,f){
  if(!date)return !f.dateFrom&&!f.dateTo;
  if(f.dateFrom && date<f.dateFrom)return false;
  if(f.dateTo && date>f.dateTo)return false;
  return true;
}
function matchesAdminFilter(x,f,kind='record'){
  if(f.name && x.studentName!==f.name)return false;
  if(f.roll && String(x.roll)!==String(f.roll))return false;
  if(f.email && x.email!==f.email)return false;
  if(kind==='record'){
    if(!dateMatchesRange(x.meta.date,f))return false;
    if(f.subject && x.meta.subject!==f.subject)return false;
    if(f.teacher && (x.record.teacher||'')!==f.teacher)return false;
    if(f.status && (!x.record.homework || (f.status==='completed'?!x.record.completed:x.record.completed)))return false;
  }else{
    if(!dateMatchesRange(x.date||'',f))return false;
    if(f.subject && x.subject!==f.subject)return false;
    if(f.teacher && (x.teacher||'')!==f.teacher)return false;
  }
  return true;
}
function filteredCloudAggregate(f={}){
  const a=cloudAggregate();
  const rows=a.rows.filter(x=>matchesAdminFilter(x,f,'record'));
  const syllabus=a.syllabus.filter(x=>matchesAdminFilter(x,f,'syllabus'));
  const students=a.students.filter(st=>{
    const p=st.profile||{}, name=p.name||st.name||'Unnamed student', email=p.email||st.email||'', roll=p.roll||'';
    if(f.name&&name!==f.name)return false;if(f.email&&email!==f.email)return false;if(f.roll&&String(roll)!==String(f.roll))return false;
    if(!f.dateFrom&&!f.dateTo&&!f.subject&&!f.teacher&&!f.status)return true;
    const sid=st.id||st.uid||'';
    return rows.some(x=>x.studentId===sid)||syllabus.some(x=>x.studentName===name&&x.email===email);
  });
  return {students,rows,syllabus};
}
function wireAdminFilter(prefix, render){
  populateAdminFilter(prefix);
  const ids=['Name','Roll','Email','DateFrom','DateTo','Subject','Teacher','Status'];
  ids.forEach(k=>$(`${prefix}${k}`)?.addEventListener('change',()=>render(readAdminFilters(prefix))));
  $(`${prefix}Export`)?.addEventListener('click',()=>exportCloudPdf(`Homework Reminder — Firebase Filtered Export`,readAdminFilters(prefix)));
  $(`${prefix}Delete`)?.addEventListener('click',()=>deleteFilteredFirebaseData(readAdminFilters(prefix)));
}

function filterHasAny(f){return !!(f.name||f.roll||f.email||f.dateFrom||f.dateTo||f.subject||f.teacher||f.status)}
function filterDescription(f){
  const parts=[];
  if(f.name)parts.push(`Student: ${f.name}`);if(f.roll)parts.push(`Roll: ${f.roll}`);if(f.email)parts.push(`Email: ${f.email}`);
  if(f.dateFrom||f.dateTo)parts.push(`Date: ${f.dateFrom||'start'} → ${f.dateTo||'end'}`);if(f.subject)parts.push(`Subject: ${f.subject}`);if(f.teacher)parts.push(`Teacher: ${f.teacher}`);if(f.status)parts.push(`Homework: ${f.status}`);
  return parts.join(' · ')||'ALL student educational data';
}
function extraMatchesFilter(extra,st,f){
  const p=st.profile||{};const name=p.name||st.name||'Unnamed student',email=p.email||st.email||'',roll=p.roll||'';
  if(f.name&&name!==f.name)return false;if(f.roll&&String(roll)!==String(f.roll))return false;if(f.email&&email!==f.email)return false;
  if(!dateMatchesRange(extra.date||'',f))return false;if(f.subject&&extra.subject!==f.subject)return false;if(f.teacher&&(extra.teacher||'')!==f.teacher)return false;return true;
}
async function deleteFilteredFirebaseData(filters={}){
  if(!adminUser){toast('Admin Firebase login is required for deletion.');return}
  if(filters.dateFrom&&filters.dateTo&&filters.dateFrom>filters.dateTo){toast('From date cannot be after To date.');return}
  const warning=filterHasAny(filters)
    ? `This will permanently delete matching classwork, homework, syllabus entries and extra-class data from Firebase.

${filterDescription(filters)}

Student accounts, passwords and profile name/roll/email will NOT be deleted.`
    : `This will permanently delete ALL students' saved classwork, homework, syllabus entries and extra-class data from Firebase.

Student accounts, passwords and profiles will NOT be deleted.`;
  if(!await confirmBox('⚠ DELETE FIREBASE DATA',warning))return;
  try{
    cloudStudents=await CloudAPI.getAllStudents();
    let changedStudents=0,deletedRecords=0,deletedSyllabus=0,deletedExtras=0;
    for(const st of cloudStudents){
      const p=st.profile||{};const name=p.name||st.name||'Unnamed student',email=p.email||st.email||'',roll=p.roll||'';
      if(filters.name&&name!==filters.name)continue;if(filters.roll&&String(roll)!==String(filters.roll))continue;if(filters.email&&email!==filters.email)continue;
      const next=clone(st);delete next.id;
      let changed=false;
      const records={};
      Object.entries(st.records||{}).forEach(([k,r])=>{
        const m=recordMeta(k);const x={studentName:name,email,roll,key:k,record:r||{},meta:m};
        if(matchesAdminFilter(x,filters,'record')){deletedRecords++;changed=true}else records[k]=r;
      });
      next.records=records;
      const syllabus={};
      Object.entries(st.syllabus||{}).forEach(([subject,arr])=>{
        const kept=(Array.isArray(arr)?arr:[]).filter(item=>{
          const x={studentId:st.id||st.uid||'',studentName:name,email,roll,subject,...item};
          if(matchesAdminFilter(x,filters,'syllabus')){deletedSyllabus++;changed=true;return false}return true;
        });
        if(kept.length)syllabus[subject]=kept;
      });
      next.syllabus=syllabus;
      next.extras=(Array.isArray(st.extras)?st.extras:[]).filter(ex=>{if(extraMatchesFilter(ex,st,filters)){deletedExtras++;changed=true;return false}return true});
      if(changed){await CloudAPI.adminSaveUserData(st.id||st.uid,next);changedStudents++;}
    }
    cloudStudents=await CloudAPI.getAllStudents();
    refreshAdminCloudPanels();
    toast(`✓ Deleted ${deletedRecords} records, ${deletedSyllabus} syllabus entries, ${deletedExtras} extra classes from Firebase`);
  }catch(e){console.error('Firebase deletion failed:',e);toast(`Firebase deletion failed (${e?.code||'unknown'}). Check Rules.`)}
}

async function loadAdminCloudData(el){
  try{
    cloudStudents=await CloudAPI.getAllStudents();
    const list=$('studentList'); if(!list)return;
    const note=document.querySelector('#studentsPanel .adminNote');
    if(note)note.textContent='Cloud-connected students. Select VIEW RECORDS to inspect saved classwork, homework and syllabus. Exports are read directly from Firebase.';
    refreshAdminCloudPanels();
    const redrawStudents=()=>{
      populateAdminFilter('st');
      const sf=readAdminFilters('st'),search=($('adminStudentSearch')?.value||'').toLowerCase();
      const filtered=filteredCloudAggregate(sf);
      const allowed=new Set(filtered.students.map(st=>st.id||st.uid||''));
      const visible=cloudStudents.filter(st=>{
        const p=st.profile||{},n=p.name||st.name||'Unnamed student',ro=String(p.roll||'');
        if(search&&!((n+' '+ro).toLowerCase().includes(search)))return false;
        return allowed.has(st.id||st.uid||'');
      });
      list.innerHTML=visible.length?visible.map(st=>{const i=cloudStudents.indexOf(st);return `<div class="adminListRow"><div><b>${esc(st.profile?.name||st.name||'Unnamed student')}</b><small>${esc(st.profile?.email||st.email||'')} ${st.profile?.roll?' · Roll '+esc(st.profile.roll):''}</small></div><div class="adminRowActions"><button class="addRow" data-cloud-view="${i}">VIEW RECORDS</button><button class="settingSave" data-cloud-export="${i}">EXPORT PDF</button><button class="dangerBtn" data-cloud-delete="${i}">DELETE DATA</button></div></div>`}).join(''):'<div class="empty glass">No student cloud records match the selected filter.</div>';
      list.querySelectorAll('[data-cloud-view]').forEach(b=>b.onclick=()=>showCloudStudentDetails(cloudStudents[Number(b.dataset.cloudView)]));
      list.querySelectorAll('[data-cloud-export]').forEach(b=>b.onclick=()=>{const st=cloudStudents[Number(b.dataset.cloudExport)],p=st.profile||{};exportCloudPdf(`Homework Reminder — Firebase Export — ${p.name||st.name||'Student'}`,{name:p.name||st.name||'',email:p.email||st.email||'',roll:p.roll||''})});
      list.querySelectorAll('[data-cloud-delete]').forEach(b=>b.onclick=()=>{const st=cloudStudents[Number(b.dataset.cloudDelete)],p=st.profile||{};deleteFilteredFirebaseData({name:p.name||st.name||'',email:p.email||st.email||'',roll:p.roll||''})});
    };
    ['Name','Email','Roll','Date','Subject','Teacher'].forEach(k=>$(`st${k}`)?.addEventListener('change',redrawStudents));
    $('adminStudentSearch')?.addEventListener('input',redrawStudents);
    $('stExport')?.addEventListener('click',()=>exportCloudPdf('Homework Reminder — Firebase Filtered Student Export',readAdminFilters('st')));
    redrawStudents();
  }catch(e){console.error('Admin cloud read failed:',e);const note=document.querySelector('#studentsPanel .adminNote');if(note)note.textContent=`Unable to read cloud students (${e?.code||'unknown'}). Check the published Firestore Rules.`}
}
function showCloudStudentDetails(st){
  const box=$('studentCloudDetail'); if(!box)return;
  const d=st||{}, rec=Object.entries(d.records||{}), hw=rec.filter(([,r])=>r.homework), topics=rec.filter(([,r])=>r.topic);
  const syl=d.syllabus||{};
  box.innerHTML=`<div class="adminRecord"><h3>${esc(d.profile?.name||'Student')}</h3><small>${esc(d.profile?.email||'')} ${d.profile?.roll?' · Roll '+esc(d.profile.roll):''}</small><p><b>${rec.length}</b> classwork records · <b>${hw.length}</b> homework records · <b>${topics.length}</b> taught-topic records</p></div><h4 class="subhead">Classwork</h4>${topics.slice().reverse().slice(0,50).map(([k,r])=>{const m=recordMeta(k);return `<div class="adminRecord"><b>${esc(m.subject)}</b><span>${esc(m.date)} · ${esc(m.time)}</span><p><strong>Chapter:</strong> ${esc(r.chapter||'—')} · <strong>Topic:</strong> ${esc(r.topic||'—')}</p><small>Teacher: ${esc(r.teacher||'—')}</small></div>`}).join('')||'<div class="empty glass">No classwork records.</div>'}<h4 class="subhead">Homework</h4>${hw.slice().reverse().slice(0,50).map(([k,r])=>{const m=recordMeta(k);return `<div class="adminRecord"><b>${esc(m.subject)}</b><span>${esc(m.date)} · ${esc(m.time)}</span><p>${esc(r.homework)}</p><small>${r.completed?'✓ Completed':'○ Pending'}</small></div>`}).join('')||'<div class="empty glass">No homework records.</div>'}<h4 class="subhead">Syllabus</h4>${Object.entries(syl).map(([sub,arr])=>`<div class="adminRecord"><b>${esc(sub)}</b><p>${(Array.isArray(arr)?arr:[]).slice(-20).map(t=>`${esc(t.chapter||'No chapter')}: ${esc(t.topic||'')}`).join(' · ')||'No topics'}</p></div>`).join('')||'<div class="empty glass">No syllabus records.</div>'}`;
  box.scrollIntoView({behavior:'smooth',block:'start'});
}

function cloudAggregate(){
  const students=Array.isArray(cloudStudents)?cloudStudents:[];
  const rows=[];
  students.forEach(st=>{
    const profile=st.profile||{};
    Object.entries(st.records||{}).forEach(([k,r])=>{
      const m=recordMeta(k);
      rows.push({studentId:st.id||st.uid||'',studentName:profile.name||st.name||'Unnamed student',email:profile.email||st.email||'',roll:profile.roll||'',key:k,record:r||{},meta:m});
    });
  });
  const syllabus=[];
  students.forEach(st=>{
    const profile=st.profile||{};
    Object.entries(st.syllabus||{}).forEach(([subject,arr])=>{
      (Array.isArray(arr)?arr:[]).forEach(item=>syllabus.push({studentId:st.id||st.uid||'',studentName:profile.name||st.name||'Unnamed student',email:profile.email||st.email||'',roll:profile.roll||'',subject,...item}));
    });
  });
  return {students,rows,syllabus};
}
function refreshAdminCloudPanels(){
  if(!adminSession)return;
  const cl=$('adminClassworkList'),hw=$('adminHomeworkList'),sy=$('adminSyllabusList');
  const renderClass=(f={})=>{const records=cloudAggregate().rows.filter(x=>matchesAdminFilter(x,f,'record')&&x.record.topic);if(cl)cl.innerHTML=records.slice().sort((a,b)=>(b.meta.date+b.meta.time).localeCompare(a.meta.date+a.meta.time)).map(x=>`<div class="adminRecord"><b>${esc(x.meta.subject)}</b><span>${esc(x.meta.date)} · ${esc(x.meta.time)} · ${esc(x.studentName)}</span><p><strong>Chapter:</strong> ${esc(x.record.chapter||'—')} · <strong>Topic:</strong> ${esc(x.record.topic||'—')}</p><small>Teacher: ${esc(x.record.teacher||'—')} · ${esc(x.email)}${x.roll?' · Roll '+esc(x.roll):''}</small></div>`).join('')||'<div class="empty glass">No classwork records for the selected filter.</div>'};
  const renderHomework=(f={})=>{const records=cloudAggregate().rows.filter(x=>matchesAdminFilter(x,f,'record')&&x.record.homework&&x.record.homework.trim());if(hw)hw.innerHTML=records.slice().sort((a,b)=>(b.meta.date+b.meta.time).localeCompare(a.meta.date+a.meta.time)).map(x=>`<div class="adminRecord"><b>${esc(x.meta.subject)}</b><span>${esc(x.meta.date)} · ${esc(x.meta.time)} · ${esc(x.studentName)}</span><p>${esc(x.record.homework)}</p><small>${x.record.completed?'✓ Completed':'○ Pending'} · Teacher: ${esc(x.record.teacher||'—')} · ${esc(x.email)}${x.roll?' · Roll '+esc(x.roll):''}</small></div>`).join('')||'<div class="empty glass">No homework records for the selected filter.</div>'};
  const renderSyllabus=(f={})=>{const topics=cloudAggregate().syllabus.filter(x=>matchesAdminFilter(x,f,'syllabus'));if(sy)sy.innerHTML=topics.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x=>`<div class="adminRecord"><b>${esc(x.subject)}</b><span>${esc(x.date||'')} · ${esc(x.studentName)}</span><p><strong>Chapter:</strong> ${esc(x.chapter||'—')} · <strong>Topic:</strong> ${esc(x.topic||'—')}</p><small>Teacher: ${esc(x.teacher||'—')} · ${esc(x.email)}${x.roll?' · Roll '+esc(x.roll):''}</small></div>`).join('')||'<div class="empty glass">No syllabus records for the selected filter.</div>'};
  wireAdminFilter('cw',f=>renderClass(f));wireAdminFilter('hw',f=>renderHomework(f));wireAdminFilter('sy',f=>renderSyllabus(f));
  renderClass(readAdminFilters('cw'));renderHomework(readAdminFilters('hw'));renderSyllabus(readAdminFilters('sy'));
  const a=cloudAggregate(),stats=document.querySelectorAll('.adminStatsGrid .adminStat strong');if(stats.length>=4){const hwRows=a.rows.filter(x=>x.record.homework&&x.record.homework.trim());stats[0].textContent=a.students.length;stats[1].textContent=a.rows.length;stats[2].textContent=hwRows.length;stats[3].textContent=a.syllabus.length;}
  const analytics=document.querySelector('#analyticsPanel .analyticsBars');if(analytics){const hwRows=a.rows.filter(x=>x.record.homework&&x.record.homework.trim());const vals=[hwRows.length?Math.round(hwRows.filter(x=>x.record.completed).length/hwRows.length*100):0,a.rows.length?Math.round(a.rows.filter(x=>x.record.topic).length/a.rows.length*100):0,a.rows.length?Math.round(a.rows.filter(x=>x.record.chapter).length/a.rows.length*100):0];analytics.querySelectorAll('b').forEach((b,i)=>b.textContent=vals[i]+'%');const note=document.querySelector('#analyticsPanel .adminNote');if(note)note.textContent='Analytics are calculated from all student records currently stored in Firebase.';}
}

function buildAdminExportHtml(title,aggregate){
  const {students,rows,syllabus}=aggregate;
  const escH=esc;
  const dayOf=date=>date?new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long'}):'';
  const sortRows=(a,b)=>((a.meta.date||'')+'|'+(a.meta.subject||'')+'|'+(a.record.teacher||'')+'|'+(a.meta.time||'')+'|'+(a.studentName||'')).localeCompare((b.meta.date||'')+'|'+(b.meta.subject||'')+'|'+(b.record.teacher||'')+'|'+(b.meta.time||'')+'|'+(b.studentName||''));
  const byDateSubjectTeacher=(rs)=>{
    const groups=new Map();
    rs.slice().sort(sortRows).forEach(x=>{
      const dk=x.meta.date||'Unknown date';
      const sk=x.meta.subject||'Unknown subject';
      const tk=x.record.teacher||'Teacher not recorded';
      if(!groups.has(dk))groups.set(dk,new Map());
      if(!groups.get(dk).has(sk))groups.get(dk).set(sk,new Map());
      if(!groups.get(dk).get(sk).has(tk))groups.get(dk).get(sk).set(tk,[]);
      groups.get(dk).get(sk).get(tk).push(x);
    });
    return groups;
  };
  const renderGrouped=(rs)=>{
    const groups=byDateSubjectTeacher(rs);
    if(!rs.length)return '<div class="emptyRow">No classwork/homework records.</div>';
    let html='';
    groups.forEach((subjects,date)=>{
      html+=`<div class="dateBlock"><h3>${escH(date)} <span>${escH(dayOf(date))}</span></h3>`;
      subjects.forEach((teachers,subject)=>{
        html+=`<h4 class="subjectHead">${escH(subject)}</h4>`;
        teachers.forEach((items,teacher)=>{
          html+=`<div class="teacherHead">Teacher: ${escH(teacher)}</div><table><thead><tr><th>Time</th><th>Chapter</th><th>Topic Taught</th><th>Homework</th><th>Status</th><th>Student</th><th>Email / Roll</th></tr></thead><tbody>`;
          items.forEach(x=>html+=`<tr><td>${escH(x.meta.time||'')}</td><td>${escH(x.record.chapter||'')}</td><td>${escH(x.record.topic||'')}</td><td>${escH(x.record.homework||'')}</td><td>${x.record.homework?(x.record.completed?'Completed':'Pending'):''}</td><td>${escH(x.studentName)}</td><td>${escH(x.email||'')}${x.roll?' · Roll '+escH(x.roll):''}</td></tr>`);
          html+='</tbody></table>';
        });
      });
      html+='</div>';
    });
    return html;
  };
  const studentSections=students.map(st=>{
    const p=st.profile||{};
    const sid=st.id||st.uid||'';
    const rs=rows.filter(x=>x.studentId===sid);
    const ss=syllabus.filter(x=>x.studentId===sid || (x.studentName===(p.name||st.name||'Unnamed student')&&x.email===(p.email||st.email||'')));
    const subjectMap=new Map();
    rs.slice().sort((a,b)=>((a.meta.subject||'')+'|'+(a.record.teacher||'')).localeCompare((b.meta.subject||'')+'|'+(b.record.teacher||''))).forEach(x=>{
      const key=x.meta.subject||'Unknown subject';
      if(!subjectMap.has(key))subjectMap.set(key,new Map());
      const teacher=x.record.teacher||'Teacher not recorded';
      if(!subjectMap.get(key).has(teacher))subjectMap.get(key).set(teacher,[]);
      subjectMap.get(key).get(teacher).push(x);
    });
    let subjectSummary='';
    subjectMap.forEach((teachers,subject)=>{
      subjectSummary+=`<div class="subjectSummary"><h4>${escH(subject)}</h4>`;
      teachers.forEach((items,teacher)=>{
        subjectSummary+=`<p class="teacherLine"><b>Teacher:</b> ${escH(teacher)} · ${items.length} record${items.length===1?'':'s'}</p><table><thead><tr><th>Date</th><th>Day</th><th>Time</th><th>Chapter</th><th>Topic</th><th>Homework</th><th>Status</th></tr></thead><tbody>`;
        items.slice().sort((a,b)=>((a.meta.date||'')+'|'+(a.meta.time||'')).localeCompare((b.meta.date||'')+'|'+(b.meta.time||''))).forEach(x=>subjectSummary+=`<tr><td>${escH(x.meta.date)}</td><td>${escH(dayOf(x.meta.date))}</td><td>${escH(x.meta.time)}</td><td>${escH(x.record.chapter||'')}</td><td>${escH(x.record.topic||'')}</td><td>${escH(x.record.homework||'')}</td><td>${x.record.homework?(x.record.completed?'Completed':'Pending'):''}</td></tr>`);
        subjectSummary+='</tbody></table>';
      });
      subjectSummary+='</div>';
    });
    const syllabusRows=ss.slice().sort((a,b)=>((a.date||'')+'|'+(a.subject||'')).localeCompare((b.date||'')+'|'+(b.subject||''))).map(x=>`<tr><td>${escH(x.date||'')}</td><td>${escH(dayOf(x.date||''))}</td><td>${escH(x.subject||'')}</td><td>${escH(x.chapter||'')}</td><td>${escH(x.topic||'')}</td><td>${escH(x.teacher||'')}</td></tr>`).join('');
    return `<section class="student"><h2>${escH(p.name||st.name||'Unnamed student')}</h2><p><b>Email:</b> ${escH(p.email||st.email||'')}${p.roll?' · <b>Roll:</b> '+escH(p.roll):''}</p><div class="studentStats"><span>Records: <b>${rs.length}</b></span><span>Homework: <b>${rs.filter(x=>x.record.homework&&x.record.homework.trim()).length}</b></span><span>Syllabus: <b>${ss.length}</b></span></div><h3>1. Daily Classwork & Homework — Date → Subject → Teacher</h3>${renderGrouped(rs)}<h3>2. Subject-wise Summary — Subject → Teacher → Date</h3>${subjectSummary||'<div class="emptyRow">No subject records.</div>'}<h3>3. Syllabus / Topics</h3><table><thead><tr><th>Date</th><th>Day</th><th>Subject</th><th>Chapter</th><th>Topic</th><th>Teacher</th></tr></thead><tbody>${syllabusRows||'<tr><td colspan="6">No syllabus records.</td></tr>'}</tbody></table></section>`;
  }).join('');
  const overallSorted=rows.slice().sort(sortRows);
  const overall=overallSorted.map(x=>`<tr><td>${escH(x.meta.date)}</td><td>${escH(dayOf(x.meta.date))}</td><td>${escH(x.meta.subject)}</td><td>${escH(x.record.teacher||'')}</td><td>${escH(x.meta.time)}</td><td>${escH(x.studentName)}</td><td>${escH(x.roll)}</td><td>${escH(x.record.chapter||'')}</td><td>${escH(x.record.topic||'')}</td><td>${escH(x.record.homework||'')}</td><td>${x.record.homework?(x.record.completed?'Completed':'Pending'):''}</td></tr>`).join('');
  const teacherMap=new Map();overallSorted.forEach(x=>{const t=x.record.teacher||'Teacher not recorded';if(!teacherMap.has(t))teacherMap.set(t,[]);teacherMap.get(t).push(x)});
  let teacherIndex='';teacherMap.forEach((items,teacher)=>{teacherIndex+=`<h4>${escH(teacher)}</h4><table><thead><tr><th>Date</th><th>Subject</th><th>Time</th><th>Student</th><th>Chapter</th><th>Topic</th><th>Homework</th><th>Status</th></tr></thead><tbody>`;items.forEach(x=>teacherIndex+=`<tr><td>${escH(x.meta.date)}</td><td>${escH(x.meta.subject)}</td><td>${escH(x.meta.time)}</td><td>${escH(x.studentName)}</td><td>${escH(x.record.chapter||'')}</td><td>${escH(x.record.topic||'')}</td><td>${escH(x.record.homework||'')}</td><td>${x.record.homework?(x.record.completed?'Completed':'Pending'):''}</td></tr>`);teacherIndex+='</tbody></table>'});
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escH(title)}</title><style>body{font-family:Arial,sans-serif;padding:18px;color:#111;font-size:11px}h1{font-size:24px;margin:0 0 6px}h2{font-size:19px;margin:24px 0 8px}h3{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #333;padding-bottom:4px}h4{font-size:12px;margin:12px 0 5px}.muted{color:#666}.summary{border:1px solid #aaa;padding:10px;margin:12px 0}.student{page-break-before:always}.student:first-of-type{page-break-before:auto}.dateBlock{margin-bottom:18px}.dateBlock>h3{background:#eee;padding:7px}.dateBlock>h3 span{font-weight:normal;color:#555;margin-left:8px}.subjectHead{margin-left:8px;font-size:13px}.teacherHead{font-weight:bold;margin:5px 0 3px 16px}.studentStats{display:flex;gap:22px;border:1px solid #bbb;padding:7px;margin:8px 0}.subjectSummary{margin-bottom:14px}.teacherLine{margin:3px 0 5px}table{width:100%;border-collapse:collapse;margin:5px 0 14px;font-size:8.5px;page-break-inside:auto}th,td{border:1px solid #777;padding:4px;vertical-align:top}th{background:#eee}tr{page-break-inside:avoid}.emptyRow{border:1px solid #bbb;padding:8px;color:#666}@media print{body{padding:0}@page{size:A4 landscape;margin:9mm}thead{display:table-header-group}.student{page-break-before:always}}</style></head><body><h1>${escH(title)}</h1><p class="muted"><b>Source:</b> Firebase cloud student data (not admin-device local data)<br><b>Generated:</b> ${escH(new Date().toLocaleString('en-IN'))}</p><div class="summary"><b>Students:</b> ${students.length} · <b>Classwork/Homework records:</b> ${rows.length} · <b>Syllabus entries:</b> ${syllabus.length}<br>Organization: <b>Date → Subject → Teacher</b>, with student-wise and subject-wise sections.</div><h2>Overall Cloud Report — Date → Subject → Teacher</h2><table><thead><tr><th>Date</th><th>Day</th><th>Subject</th><th>Teacher</th><th>Time</th><th>Student</th><th>Roll</th><th>Chapter</th><th>Topic</th><th>Homework</th><th>Status</th></tr></thead><tbody>${overall||'<tr><td colspan="11">No records.</td></tr>'}</tbody></table><h2>Teacher-wise Index</h2>${teacherIndex||'<div class="emptyRow">No teacher records.</div>'}${studentSections}</body></html>`;
}
async function loadFreshCloudStudentsForExport(){
  if(!adminUser){toast('Admin Firebase login is required for cloud export.');return false}
  try{cloudStudents=await CloudAPI.getAllStudents();return true}catch(e){console.error('Cloud export read failed:',e);toast(`Firebase cloud export failed (${e?.code||'unknown'}). Check Firestore Rules.`);return false}
}
async function exportCloudPdf(title='Homework Reminder — Complete Firebase Cloud Data',filters={}){
  if(!await loadFreshCloudStudentsForExport())return;
  const a=filteredCloudAggregate(filters);
  if(!a.students.length && !a.rows.length && !a.syllabus.length){toast('No Firebase data matches the selected filters.');return}
  const w=window.open('','_blank');if(!w){toast('Allow pop-ups for PDF export.');return}
  w.document.open();w.document.write(buildAdminExportHtml(title,a).replace('</body>','<script>window.onload=function(){setTimeout(function(){window.focus();window.print()},400)};<\/script></body>'));w.document.close();
  toast('✓ Firebase filtered data prepared for PDF export');
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
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
}
function navBar(){return `<nav><button data-page="today">⌂<br>Today</button><button data-page="homework">✓<br>Homework</button><button data-page="syllabus">◈<br>Syllabus</button><button data-page="ai">✦<br>Gemini AI</button><button data-page="settings">⚙<br>Settings</button></nav>`}
function calendarBar(){return `<div class="calendarbar"><button class="iconBtn" id="prev">‹</button><button class="datePicker" id="datePicker"><span class="calendarIcon">▣</span><span>${esc(fmt(today))}</span></button><button class="iconBtn" id="next">›</button><button class="todayBtn" id="jumpToday">Today</button><input id="hiddenDate" type="date" value="${iso(today)}"></div>`}
function classCardMarkup(c,i){const r=recordForClass(c),teacher=r.teacher||c.teacher||D.teachers[c.scheduledSubject]||D.teachers[c.subject]||'';return `<div class="classEntryWrap" data-i="${i}"><article class="classCard ${c.extra?'extraCard':''}"><div class="cardTopRow"><span class="timePill">${esc(c.time)}</span><div class="cardSubject"><h2>${esc(c.subject)}</h2><input class="cardTeacherInput teacherUnderSubject" value="${esc(teacher)}" placeholder="Teacher name"><small class="defaultTeacher subjectDefaultTeacher">Default teacher: ${esc(c.teacher||'Not set')}</small></div>${c.extra?'<span class="extraPill">EXTRA</span>':''}</div><div class="cardChapter"><label class="cardFieldLabel">CHAPTER</label><input class="cardChapterInput" value="${esc(r.chapter||'')}" placeholder="Chapter (optional)"></div><div class="cardMiddle"><div class="cardHalf"><label class="cardFieldLabel">TOPIC TAUGHT</label><textarea class="cardTopic" placeholder="What was taught today?">${esc(r.topic||'')}</textarea></div><div class="cardHalf"><label class="cardFieldLabel">HOMEWORK</label><textarea class="cardHomework" placeholder="Homework / assignment">${esc(r.homework||'')}</textarea></div></div><div class="cardActions"><button class="cardSaveBtn">SAVE</button>${c.extra?'<button class="cardDeleteBtn">DELETE</button>':''}</div></article></div>`}
function renderToday(el){
  if(today<APP_START_DATE)today=startOfDay(APP_START_DATE);
  const a=classesForDate(today),locked=today<APP_START_DATE;
  el.innerHTML=calendarBar()+`<div class="dayHint">${a.length?`${a.length} class${a.length===1?'':'es'} scheduled`:'No classes scheduled'}</div>`+(a.length?a.map(classCardMarkup).join(''):'<div class="empty glass">Your day is clear.</div>')+`<button class="extraBtn" id="extra">＋ Extra Class</button><div class="miniCard"><div class="miniTitle"><b>Quick actions</b><span>${D.reminders.filter(r=>!r.done).length} reminders</span></div><p class="small">Tap a class to record the topic, actual teacher and homework. The schedule remains unchanged.</p><button class="chip" id="openReminders">VIEW REMINDERS</button></div>`;
  $('prev').onclick=()=>{if(today<=APP_START_DATE){toast('Classes begin on 7 September 2026');return}today.setDate(today.getDate()-1);if(today<APP_START_DATE)today=startOfDay(APP_START_DATE);show('today')};
  $('next').onclick=()=>{today.setDate(today.getDate()+1);show('today')};
  $('jumpToday').onclick=()=>{today=startOfDay(new Date());if(today<APP_START_DATE)today=startOfDay(APP_START_DATE);show('today')};
  $('datePicker').onclick=()=>{const x=$('hiddenDate');x.min=iso(APP_START_DATE);x.showPicker?x.showPicker():x.click()};
  $('hiddenDate').onchange=e=>{if(e.target.value<iso(APP_START_DATE)){toast('Dates before 7 September 2026 are locked');return}today=startOfDay(new Date(e.target.value+'T00:00:00'));show('today')};
  $('extra').onclick=extra;$('openReminders').onclick=()=>show('reminders');
  el.querySelectorAll('.cardSaveBtn').forEach((b,i)=>b.onclick=()=>saveCard(a[i],b));el.querySelectorAll('.cardDeleteBtn').forEach((b,i)=>b.onclick=async()=>{if(today<APP_START_DATE)return toast('Classes are locked before 7 September 2026');const c=a[i];if(!await confirmBox('Delete extra class?','This extra class will be removed.'))return;D.extras=D.extras.filter(x=>x.id!==c.id);saveAll();toast('✓ Extra class deleted');show('today')});
  el.querySelectorAll('.classEntryWrap').forEach((w,i)=>['.cardChapterInput','.cardTopic','.cardHomework','.cardTeacherInput'].forEach(sel=>{w.querySelector(sel)?.addEventListener('input',()=>{if(today<APP_START_DATE){return}const c=a[i],old=recordForClass(c);D.records[recKey(c)]={...old,teacher:w.querySelector('.cardTeacherInput').value.trim(),chapter:w.querySelector('.cardChapterInput').value.trim(),topic:w.querySelector('.cardTopic').value,homework:w.querySelector('.cardHomework').value};saveAll()})}));
}
function saveCard(c,btn){if(today<APP_START_DATE){toast('Classes are locked before 7 September 2026');return}const w=btn.closest('.classEntryWrap'),old=recordForClass(c),teacher=w.querySelector('.cardTeacherInput').value.trim(),chapter=w.querySelector('.cardChapterInput').value.trim(),topic=w.querySelector('.cardTopic').value,homework=w.querySelector('.cardHomework').value;D.records[recKey(c)]={teacher,chapter,topic,homework,completed:!!old.completed};if(teacher){D.teachers[c.scheduledSubject||c.subject]=teacher;D.teachers[c.subject]=teacher}saveAll();btn.textContent='✓ SAVED';toast('✓ Classwork saved');scheduleHomeworkReminder(c,homework);setTimeout(()=>btn.textContent='SAVE',1200)}
function extra(){if(today<APP_START_DATE){toast('Extra classes are locked before 7 September 2026');return}const el=document.createElement('section');el.id='details';$('main').replaceChildren(el);$('pageTitle').textContent='Extra Class';$('dateLine').textContent=fmt(today);el.innerHTML=`<button class="backLink" id="eback">‹ Back to Today</button><div class="formCard"><div class="detailHero"><span class="subjectIcon">＋</span><div><div class="eyebrow">EXTRA CLASS</div><h2>Add to this date</h2><p>${esc(fmt(today))}</p></div></div><label>Subject</label><select id="es">${SUBJECTS.map(x=>`<option>${esc(x)}</option>`).join('')}</select><div class="twoCol"><div><label>Start</label><input id="st" type="time"></div><div><label>End</label><input id="en" type="time"></div></div><label>Teacher</label><input id="et" placeholder="Teacher name"><button class="primary wideAction" id="esave">SAVE EXTRA CLASS</button></div>`;$('eback').onclick=()=>show('today');$('esave').onclick=()=>{if(!$('st').value||!$('en').value||$('en').value<=$('st').value){toast('Choose valid start and end time');return}D.extras.push({id:Date.now().toString(36),date:iso(today),subject:$('es').value,time:$('st').value+'–'+$('en').value,teacher:$('et').value.trim()||'Not set'});saveAll();toast('✓ Extra class saved');show('today')}}
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
async function askGemini(prompt){const model=D.admin?.ai?.model||'gemini-3.8-flash';const fullPrompt=`You are the Classwork Planner study assistant. Answer clearly and accurately. You may use the student's records below. Do not invent records.\n\nSTUDENT DATA:\n${aiContext()}\n\nUSER QUESTION:\n${prompt}`;try{return await GeminiAPI.generate(fullPrompt,model)}catch(e){console.error('Gemini AI error:',e);const msg=String(e?.message||e||'');const code=String(e?.code||'');if(/429|resource.?exhausted|quota|rate.?limit/i.test(msg+' '+code)){toast('Gemini is temporarily unavailable. Please try again later.')}else if(/GEMINI_REQUEST_TIMEOUT|deadline|timeout/i.test(msg+' '+code)){toast('Gemini is temporarily unavailable. Please try again later.')}else if(/app.?check|permission-denied|403|unauthorized/i.test(msg+' '+code)){toast('Gemini is temporarily unavailable. Please try again later.')}else if(/not found|404|model/i.test(msg+' '+code)){toast('Gemini is temporarily unavailable. Please try again later.')}else{toast('Gemini is temporarily unavailable. Please try again later.')}return ''}}
function renderAI(el){el.innerHTML=`<div class="sectionHead"><div><div class="eyebrow">STUDY ASSISTANT</div><h2>Gemini AI</h2><p class="mutedIntro">Ask anything. Gemini can also use your saved classwork, homework and syllabus.</p></div></div><div class="formCard"><label>Ask Gemini</label><textarea id="aiPrompt" placeholder="e.g. Consolidate my syllabus and make a revision plan."></textarea><div class="suggestions"><button class="chip" data-q="Consolidate my syllabus">Consolidate my syllabus</button><button class="chip" data-q="What did I study this week?">What did I study this week?</button><button class="chip" data-q="Which topics need revision?">Topics needing revision</button><button class="chip" data-q="Prioritize my homework">Prioritize my homework</button></div><button class="primary wideAction" id="askAI">ASK GEMINI</button><div id="aiAnswer" class="miniCard aiAnswer" style="display:none"><div class="eyebrow">GEMINI RESPONSE</div><div id="aiAnswerText" class="aiAnswerText"></div></div></div>`;el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('aiPrompt').value=b.dataset.q});$('askAI').onclick=async()=>{const p=$('aiPrompt').value.trim();if(!p)return toast('Enter a question');const box=$('aiAnswer'),text=$('aiAnswerText');box.style.display='block';text.innerHTML='<span class="mutedIntro">Gemini is thinking…</span>';$('askAI').disabled=true;$('askAI').textContent='THINKING…';const a=await askGemini(p);if(a){text.innerHTML=esc(a).replace(/\n/g,'<br>')}else{box.style.display='none'}$('askAI').disabled=false;$('askAI').textContent='ASK GEMINI'}}
let studentAuthResolved=false;
let adminAuthResolved=false;
let startupFinished=false;
function closeStartupLoading(){const m=$('startupLoading');if(m)m.style.display='none'}
function finishStartupAuthCheck(){
  if(startupFinished||(!studentAuthResolved||!adminAuthResolved))return;
  startupFinished=true;
  closeStartupLoading();
  if(cloudUser||adminUser){closeStartupAuth();return;}
  showStartupAuth();
}
function closeStartupAuth(){const m=$('startupAuth');if(m)m.style.display='none'}
function showStartupAuth(){
  if(cloudUser||adminUser){closeStartupAuth();return;}
  const m=$('startupAuth');
  if(!m)return;
  m.style.display='grid';
  const status=$('startAuthStatus');
  if(status && !status.dataset.wired){
    status.dataset.wired='1';
    $('startLogin').onclick=async()=>{const n=$('startName').value.trim(),r=$('startRoll').value.trim(),e=$('startEmail').value.trim(),pw=$('startPassword').value;if(!n||!r||!e||!pw){status.textContent='Enter name, roll number, email and password';return}if(!/^\d+$/.test(r)||+r<1||+r>100){status.textContent='Enter a valid roll number (1–100)';return}status.textContent='Signing in…';const ok=await cloudSignIn(e,pw,n,r);if(ok){status.textContent=`✓ Signed in as ${e}`;setTimeout(closeStartupAuth,350)}};
    $('startSignup').onclick=async()=>{const n=$('startName').value.trim(),r=$('startRoll').value.trim(),e=$('startEmail').value.trim(),pw=$('startPassword').value;if(!n||!r||!e||!pw){status.textContent='Enter name, roll number, email and password';return}if(!/^\d+$/.test(r)||+r<1||+r>100){status.textContent='Enter a valid roll number (1–100)';return}status.textContent='Creating account…';const ok=await cloudSignUp(e,pw);if(ok){D.profile.name=n;D.profile.roll=r;saveAll();await syncCurrentUser('upload',true);status.textContent=`✓ Account created and signed in as ${e}`;setTimeout(closeStartupAuth,350)}};
    $('startAdmin').onclick=()=>showAdminLogin(true);
    $('startPassword').onkeydown=e=>{if(e.key==='Enter')$('startLogin').click()};
    $('startForgot').onclick=()=>resetStudentPassword($('startEmail').value.trim());
  }
  if(status && status.textContent==='Checking sign-in status…')status.textContent='Not signed in — local data stays on this device until you sign in.';
}
function showAdminLogin(asPopup=false){
  if(asPopup){
    const existing=$('adminAuthPopup'); if(existing)existing.remove();
    const m=document.createElement('div');
    m.id='adminAuthPopup'; m.className='startupAuthOverlay adminAuthOverlay'; m.style.display='grid';
    m.innerHTML=`<div class="startupAuthCard adminPopupCard">
      <div class="eyebrow">RESTRICTED AREA</div><h2>Admin Login</h2>
      <p class="mutedIntro">Administrator access uses Firebase Authentication plus an Admin allow-list.</p>
      <label>Admin email</label><input id="popupAdminUser" type="email" autocomplete="username" placeholder="Admin email">
      <label>Password</label><input id="popupAdminPass" type="password" autocomplete="current-password" placeholder="Password">
      <div class="twoCol"><button class="settingSave" id="popupAdminLoginBtn">LOGIN AS ADMIN</button><button class="settingSave" id="popupAdminBack">STUDENT LOGIN</button></div>
      <button class="startupForgotLink" id="popupAdminForgot">Forgot password?</button>
      <p id="popupAdminStatus" class="statusPill">Admin authentication required to enter the app.</p>
    </div>`;
    document.body.appendChild(m);
    $('popupAdminLoginBtn').onclick=async()=>{
      const e=$('popupAdminUser').value.trim(),pw=$('popupAdminPass').value,status=$('popupAdminStatus');
      if(!e||!pw){status.textContent='Enter admin email and password';return}
      const btn=$('popupAdminLoginBtn');btn.disabled=true;status.textContent='Signing in…';adminAuthInProgress=true;
      try{await CloudAPI.adminSetPersistence();await CloudAPI.adminSignIn(e,pw);const u=CloudAPI.adminCurrentUser();
        if(await CloudAPI.isAdmin(u?.uid)){adminSession=true;adminUser=u;m.remove();closeStartupAuth();show('admin');toast('✓ Admin login successful')}
        else{await CloudAPI.adminSignOut();status.textContent='Authenticated, but this account is not an admin.'}
      }catch(err){status.textContent=firebaseAuthMessage(err)}finally{adminAuthInProgress=false;btn.disabled=false}
    };
    $('popupAdminPass').onkeydown=e=>{if(e.key==='Enter')$('popupAdminLoginBtn').click()};
    $('popupAdminForgot').onclick=()=>resetAdminPassword($('popupAdminUser').value.trim());
    $('popupAdminBack').onclick=()=>{m.remove();showStartupAuth()};
    return;
  }
document.querySelectorAll('main>section').forEach(x=>x.remove());const s=document.createElement('section');s.id='adminLogin';$('main').appendChild(s);$('pageTitle').textContent='Admin Login';$('dateLine').textContent='';s.innerHTML=`<div class="authWrap"><div class="authCard glass"><div class="eyebrow">RESTRICTED AREA</div><h2>Admin Login</h2><p class="mutedIntro">Administrator access uses Firebase Authentication plus an Admin allow-list. A normal student account cannot open this dashboard.</p><label>Admin email</label><input id="adminUser" type="email" autocomplete="username" placeholder="Admin email"><label>Password</label><input id="adminPass" type="password" autocomplete="current-password" placeholder="Password"><button class="primary wideAction" id="adminLoginBtn">LOGIN AS ADMIN</button><button class="authForgotLink" id="adminForgot">Forgot password?</button><button class="backLink" id="adminCancel">← Back to Login</button><p class="tinyNote">The account must also have a Firestore document at <b>admins/&lt;Firebase UID&gt;</b> with <b>role = admin</b>. This grants administrator privileges.</p></div></div>`;$('adminLoginBtn').onclick=async()=>{const e=$('adminUser').value.trim(),p=$('adminPass').value;if(!e||!p)return toast('Enter admin email and password');$('adminLoginBtn').disabled=true;$('adminLoginBtn').textContent='AUTHENTICATING…';adminAuthInProgress=true;try{await CloudAPI.adminSetPersistence();await CloudAPI.adminSignIn(e,p);const u=CloudAPI.adminCurrentUser();if(await CloudAPI.isAdmin(u?.uid)){adminSession=true;adminUser=u;show('admin');toast('✓ Admin login successful')}else{await CloudAPI.adminSignOut();toast('Authenticated, but this account is not an admin. Add its UID to the Firestore admins collection.')}}catch(err){toast(firebaseAuthMessage(err))}finally{adminAuthInProgress=false}$('adminLoginBtn').disabled=false;$('adminLoginBtn').textContent='LOGIN AS ADMIN'};$('adminPass').onkeydown=e=>{if(e.key==='Enter')$('adminLoginBtn').click()};$('adminForgot').onclick=()=>resetAdminPassword($('adminUser').value.trim());$('adminCancel').onclick=()=>{showAdminLoginBackToStudentGate()}}
function showAdminLoginBackToStudentGate(){
  document.querySelectorAll('main>section').forEach(x=>x.remove());
  $('pageTitle').textContent='Today';
  $('dateLine').textContent='';
  showStartupAuth();
}

function renderSettings(el){el.innerHTML=`<div class="settingsGrid"><div class="settingCard"><div class="settingTitle"><span class="settingIcon">◉</span><div><h3>Student Profile</h3><p>Local profile used for records and future cloud sync.</p></div></div><input id="pname" value="${esc(D.profile.name)}" placeholder="Student name"><input id="pemail" value="${esc(D.profile.email)}" placeholder="Email"><input id="roll" type="number" min="1" max="100" value="${esc(D.profile.roll)}" placeholder="Roll number"><button class="settingSave" id="saveProfile">SAVE PROFILE</button></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">◐</span><div><h3>Theme</h3><p>Keep the v26-style adaptive appearance.</p></div></div><select id="theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">⏰</span><div><h3>Homework Reminder</h3><p>One-day-before reminder for saved homework.</p></div></div><label class="switchLine"><input id="oneDay" type="checkbox" ${D.settings.oneDayBefore?'checked':''}> One day before</label><button class="settingSave" id="reminderPage">MANAGE REMINDERS</button></div><div class="settingCard scheduleCard"><div class="settingTitle"><span class="settingIcon">▦</span><div><h3>Manage Schedule & Teachers</h3><p>Edit the preset timetable without changing historical daily records.</p></div></div><div class="scheduleToolbar"><div><label>Effective from</label><input id="effectiveDate" type="date" value="${iso(new Date())}"></div><button class="todayBtn" id="loadOriginal">Original</button></div><div id="scheduleEditor">${scheduleEditor(defaultSchedule())}</div><div class="scheduleExtraBox"><div><b>Copy schedule</b><small>Copy the current weekly schedule into a new effective-date version.</small></div><button class="addRow" id="copySchedule">COPY</button></div><button class="settingSave" id="tsave">SAVE SCHEDULE & TEACHERS</button></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">☁</span><div><h3>Firebase Cloud Account</h3><p>Sign in to sync your classwork, homework, syllabus, schedule and reminders across devices.</p></div></div>${cloudAccountMarkup()}<div class="twoCol"><button class="settingSave" id="exportData">EXPORT DATA</button><button class="settingSave" id="importData">IMPORT DATA</button></div><input id="importFile" type="file" accept="application/json" hidden></div><div class="settingCard"><div class="settingTitle"><span class="settingIcon">▣</span><div><h3>Administrator</h3><p>Restricted area. Login is required before the Admin Dashboard can be opened.</p></div></div><button class="settingSave" id="adminPage">ADMIN LOGIN</button></div></div>`;$('theme').value=D.theme;$('theme').onchange=()=>{D.theme=$('theme').value;setTheme();saveAll()};$('saveProfile').onclick=()=>{D.profile.name=$('pname').value.trim();D.profile.email=$('pemail').value.trim();D.profile.roll=$('roll').value;saveAll();toast('✓ Profile saved');show('today')};$('oneDay').onchange=e=>{D.settings.oneDayBefore=e.target.checked;saveAll()};$('reminderPage').onclick=()=>show('reminders');$('adminPage').onclick=()=>adminSession?show('admin'):showAdminLogin();$('loadOriginal').onclick=()=>{$('effectiveDate').value=iso(new Date());$('scheduleEditor').innerHTML=scheduleEditor(defaultSchedule());wireScheduleEditor()};$('effectiveDate').onchange=()=>{$('scheduleEditor').innerHTML=scheduleEditor(scheduleForDate(new Date($('effectiveDate').value+'T00:00:00')));wireScheduleEditor()};$('copySchedule').onclick=()=>{const date=$('effectiveDate').value;if(!date)return;D.changes=(D.changes||[]).filter(x=>x.date!==date);D.changes.push({date,schedule:collectSchedule()});D.changes.sort((a,b)=>a.date.localeCompare(b.date));saveAll();toast('✓ Schedule copied')};$('tsave').onclick=()=>{const date=$('effectiveDate').value,s=collectSchedule();if(!date||!Object.values(s).some(a=>a.length))return toast('Add at least one class');D.changes=(D.changes||[]).filter(x=>x.date!==date);D.changes.push({date,schedule:s});D.teachers=collectRowTeachers();saveAll();toast('✓ Schedule & teachers saved');show('today')};$('exportData').onclick=exportData;$('importData').onclick=()=>$('importFile').click();$('importFile').onchange=importData;
 if(cloudUser){$('cloudSyncNow').onclick=()=>syncCurrentUser('upload');$('cloudLogout').onclick=async()=>{try{clearTimeout(cloudSyncTimer);await syncCurrentUser('upload',true);await CloudAPI.signOut();try{localStorage.removeItem(STUDENT_SESSION_HINT)}catch(_){}toast('✓ Logged out of Firebase — your local data is kept on this device')}catch(e){toast('Could not log out')}}}
 else {$('cloudLogin').onclick=async()=>{const n=$('cloudName').value.trim(),r=$('cloudRoll').value.trim(),e=$('cloudEmail').value.trim(),p=$('cloudPassword').value;if(!n||!r||!e||!p)return toast('Enter name, roll number, email and password');if(!/^\d+$/.test(r)||+r<1||+r>100)return toast('Enter a valid roll number (1–100)');await cloudSignIn(e,p,n,r)};$('cloudSignup').onclick=async()=>{const n=$('cloudName').value.trim(),r=$('cloudRoll').value.trim(),e=$('cloudEmail').value.trim(),p=$('cloudPassword').value;if(!n||!r||!e||!p)return toast('Enter name, roll number, email and password');if(!/^\d+$/.test(r)||+r<1||+r>100)return toast('Enter a valid roll number (1–100)');await cloudSignUp(e,p);if(cloudUser){D.profile.name=n;D.profile.roll=r;saveAll();await syncCurrentUser('upload',true)}};$('cloudForgot').onclick=()=>resetStudentPassword($('cloudEmail').value.trim())}
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
    <div class="adminStat"><span>Students</span><strong>${students.length}</strong><small>Firebase cloud profiles</small></div>
    <div class="adminStat"><span>Classwork</span><strong>${records.length}</strong><small>Saved daily records</small></div>
    <div class="adminStat"><span>Homework</span><strong>${hw.length}</strong><small>${pending} pending · ${completed} completed</small></div>
    <div class="adminStat"><span>Syllabus</span><strong>${Object.values(topics).flat().length}</strong><small>${syllabusSubjects.length} subjects with records</small></div>
  </div>
  <div class="adminGrid">
  ${adminPanel('Overview','⌂',`<div class="adminTwo"><div><b>Current student</b><p>${esc(D.profile.name||'Not set')} · ${esc(D.profile.email||'No email')}</p></div><div><b>Last saved</b><p>${D._savedAt?new Date(D._savedAt).toLocaleString():'Not available'}</p></div></div><div class="adminQuick"><button class="settingSave" data-scroll="studentsPanel">STUDENTS</button><button class="settingSave" data-scroll="syllabusPanel">SYLLABUS</button><button class="settingSave" data-scroll="schedulePanel">SCHEDULE</button><button class="settingSave" data-scroll="aiPanel">GEMINI AI</button></div>`,'overviewPanel')}
  ${adminPanel('Student Management','👨‍🎓',`<div class="adminToolbar"><input id="adminStudentSearch" placeholder="Search name or roll number"><button class="addRow" id="addStudent">＋ ADD LOCAL PROFILE</button></div>${adminFilterMarkup('st')}<div id="studentList">Loading cloud students…</div><div id="studentCloudDetail" class="cloudStudentDetail"></div><p class="adminNote">When Firebase is connected, this area shows cloud student accounts and their saved classwork, homework and syllabus directly inside the app. Local profiles remain separate from cloud accounts.</p>`,'studentsPanel')}
  ${adminPanel('Classwork Monitoring','📚',`${adminFilterMarkup('cw')}<div id="adminClassworkList"><div class="empty glass">Loading cloud classwork records…</div></div>`,'classworkPanel')}
  ${adminPanel('Homework Monitoring','📝',`${adminFilterMarkup('hw',true)}<div id="adminHomeworkList"><div class="empty glass">Loading cloud homework records…</div></div>`,'homeworkPanel')}
  ${adminPanel('Syllabus Management','📖',`<div class="adminToolbar"><input id="adminSyllabusSubject" placeholder="Subject name"><input id="adminChapter" placeholder="Chapter"><input id="adminTopic" placeholder="Topic"><button class="addRow" id="addSyllabus">＋ ADD</button></div><div class="adminList" id="adminSyllabusList">${syllabusSubjects.length?syllabusSubjects.map(s=>`<div class="adminRecord"><b>${esc(s)}</b><small>${topics[s].length} recorded topic(s)</small><p>${topics[s].slice(-5).map(t=>`${esc(t.chapter||'No chapter')}: ${esc(t.topic)}`).join(' · ')}</p></div>`).join(''):'<div class="empty glass">No syllabus records yet.</div>'}</div><div class="adminQuick"><button class="settingSave" id="publishSyllabus">PUBLISH SYLLABUS</button><button class="settingSave" id="restoreSyllabus">RESTORE FROM RECORDS</button></div>`,'syllabusPanel')}
  ${adminPanel('Syllabus Monitoring','📚',`${adminFilterMarkup('sy')}<div id="adminSyllabusList"><div class="empty glass">Loading Firebase syllabus…</div></div>`,'syllabusMonitorPanel')}
  ${adminPanel('Teacher Management','👨‍🏫',`<div class="adminToolbar"><input id="adminTeacherSubject" placeholder="Subject"><input id="adminTeacherName" placeholder="Teacher name"><button class="addRow" id="addTeacher">＋ ADD / UPDATE</button></div><div class="adminList">${teacherList.length?teacherList.map(([s,t])=>`<div class="adminListRow"><div><b>${esc(s)}</b><small>${esc(t)}</small></div><button class="dangerBtn" data-delete-teacher="${esc(s)}">DELETE</button></div>`).join(''):'<div class="empty glass">No default teachers configured.</div>'}</div>`,'teachersPanel')}
  ${adminPanel('Master Schedule','🗓️',`<p class="adminNote">Admin controls for the official timetable, effective-date versions, clinical posting groups and special rotations.</p><div class="adminScheduleSummary">${DAYS.map(d=>`<div><b>${d}</b><span>${(scheduleForDate(new Date()) [d]||[]).length} classes</span></div>`).join('')}</div><div class="adminToolbar"><input id="adminScheduleDate" type="date" value="${iso(new Date())}"><button class="settingSave" id="adminScheduleCopy">COPY CURRENT SCHEDULE</button><button class="settingSave" id="adminScheduleOriginal">RESTORE ORIGINAL</button></div><p class="adminNote">Clinical Posting remains roll-group based. Schedule changes do not rewrite historical daily records.</p>`,'schedulePanel')}
  ${adminPanel('Announcements','📢',`<textarea id="announcementText" rows="3" placeholder="Write an announcement for students..."></textarea><div class="adminToolbar"><select id="announcementAudience"><option>Everyone</option><option>Selected roll group</option><option>Selected student</option></select><button class="settingSave" id="publishAnnouncement">PUBLISH</button></div><div class="adminList">${notices.slice().reverse().map(n=>`<div class="adminRecord"><b>${esc(n.text)}</b><small>${esc(n.audience||'Everyone')} · ${esc(n.date||'')}</small></div>`).join('')||'<div class="empty glass">No announcements.</div>'}</div>`,'announcementsPanel')}
  ${adminPanel('Notification Management','🔔',`${feature('notifications.homework','Homework reminders',true)}${feature('notifications.oneDay','One-day-before reminders',true)}${feature('notifications.due','Due-date reminders',true)}${feature('notifications.schedule','Schedule changes',true)}${feature('notifications.syllabus','New syllabus',true)}${feature('notifications.important','Important announcements',true)}<p class="adminNote">Students retain control over personal notification permission and reminder preferences.</p>`,'notificationsPanel')}
  ${adminPanel('Gemini AI Configuration','✦',`<p class="adminNote">Gemini is connected through Firebase AI Logic. No Gemini API key is stored in the app or Student Settings. Complete Firebase Console → AI Services → AI Logic setup and App Check before production use.</p><div class="adminToolbar"><select id="adminGeminiModel"><option value="gemini-3.8-flash">Gemini 3.8 Flash</option><option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option></select><button class="settingSave" id="saveAdminGemini">SAVE AI CONFIGURATION</button></div><div class="adminFeatureGrid">${feature('ai.syllabus','Understand syllabus',ai.syllabus!==false)}${feature('ai.classwork','Understand classwork',ai.classwork!==false)}${feature('ai.homework','Understand homework',ai.homework!==false)}${feature('ai.revision','Create revision plans',ai.revision!==false)}${feature('ai.consolidate','Consolidate syllabus',ai.consolidate!==false)}${feature('ai.questions','Answer academic questions',ai.questions!==false)}</div>`,'aiPanel')}
  ${adminPanel('Analytics','📊',`<div class="analyticsBars"><div><span>Homework completion</span><b>${hw.length?Math.round(completed/hw.length*100):0}%</b></div><div><span>Records with topic</span><b>${records.length?Math.round(records.filter(([,r])=>r.topic).length/records.length*100):0}%</b></div><div><span>Records with chapter</span><b>${records.length?Math.round(records.filter(([,r])=>r.chapter).length/records.length*100):0}%</b></div></div><p class="adminNote">Analytics are calculated locally in this prototype. Cloud-wide analytics will be available after synchronization is enabled.</p>`,'analyticsPanel')}
  ${adminPanel('Cloud & Synchronization','☁️',`<p class="adminNote">Firebase is connected to this build. Student cloud sync uses the signed-in account; admin-wide access is protected by the admins collection and Firestore Rules.</p>${feature('cloud.enabled','Enable cloud sync',true)}${feature('cloud.backup','Automatic backup',true)}${feature('cloud.force','Allow force synchronization',true)}<div class="adminToolbar"><button class="settingSave" id="cloudTest">TEST CLOUD CONNECTION</button><button class="settingSave" id="cloudBackup">BACKUP LOCAL DATA</button><button class="settingSave" id="cloudRestore">RESTORE BACKUP</button></div><p id="cloudStatus" class="statusPill">Status: ${adminUser?'Admin connected to Firebase':(cloudUser?'Student connected to Firebase':'Not signed in')}</p>`,'cloudPanel')}
  ${adminPanel('Backup & Export','💾',`<div class="adminQuick"><button class="settingSave" id="adminExport">EXPORT ALL DATA</button><button class="settingSave" id="adminExportRecords">EXPORT RECORDS CSV</button><button class="settingSave" id="adminExportPdf">EXPORT RECORDS PDF</button></div>${adminFilterMarkup('all',true)}<p class="adminNote">Exports and deletion read the latest student data directly from Firebase. Use From/To dates for an inclusive custom range; leave both empty for All dates. Filters can be combined by student, roll, email, date range, subject, teacher and homework status. PDF export and the red Delete button use the same filters.</p>`,'backupPanel')}
  ${adminPanel('App Management','📱',`<div class="adminFeatureGrid">${feature('app.gemini','Gemini AI',appcfg.gemini!==false)}${feature('app.homework','Homework',appcfg.homework!==false)}${feature('app.reminders','Reminders',appcfg.reminders!==false)}${feature('app.syllabus','Syllabus',appcfg.syllabus!==false)}${feature('app.sharing','Friend sharing',appcfg.sharing!==false)}${feature('app.maintenance','Maintenance mode',appcfg.maintenance===true)}</div><label>Minimum supported app version<input id="minVersion" value="${esc(appcfg.minVersion||'1.0.0')}"></label><button class="settingSave" id="saveAppConfig">SAVE APP CONFIGURATION</button>`,'appPanel')}
  ${adminPanel('Ads Management','💰',`<div class="adminFeatureGrid">${feature('ads.enabled','Ads enabled',ads.enabled===true)}${feature('ads.banner','Banner ads',ads.banner!==false)}${feature('ads.interstitial','Interstitial ads',ads.interstitial===true)}</div><label>Interstitial frequency<input id="adFrequency" type="number" min="1" value="${Number(ads.frequency||5)}"></label><button class="settingSave" id="saveAds">SAVE ADS CONFIGURATION</button><p class="adminNote">No ad network is connected in this local build.</p>`,'adsPanel')}
  ${adminPanel('Security & Admin Accounts','🔐',`<p class="adminNote">Admin access uses Firebase Authentication and the Firestore admins allow-list.</p><div class="adminTwo"><label>Admin username<input id="adminUsername" value="${esc(security.username||'Firebase Admin')}"></label><label>New password<input id="adminPassword" type="password" placeholder="Enter new password"></label></div><button class="settingSave" id="saveAdminSecurity">SAVE SECURITY SETTINGS</button><button class="dangerBtn" id="adminLogout2">LOG OUT ALL LOCAL ADMIN SESSIONS</button>`,'securityPanel')}
  </div>`;
  const setPath=(path,val)=>{let o=D.admin||{};const parts=path.split('.');for(let i=0;i<parts.length-1;i++){o[parts[i]]=o[parts[i]]||{};o=o[parts[i]]}o[parts.at(-1)]=val;D.admin=o;saveAll()};
  document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'}));
  document.querySelectorAll('[data-admin-setting]').forEach(x=>x.onchange=()=>setPath(x.dataset.adminSetting,x.checked));
  $('adminLogout').onclick=async()=>{try{await CloudAPI.adminSignOut()}catch(e){} adminUser=null;adminSession=false;toast('Admin logged out');if(cloudUser)show('today');else showStartupAuth()};
  $('adminLogout2').onclick=async()=>{try{await CloudAPI.adminSignOut()}catch(e){} adminUser=null;adminSession=false;toast('Admin session closed');if(cloudUser)show('today');else showStartupAuth()};
  $('saveAdminGemini').onclick=()=>{D.admin=D.admin||{};D.admin.ai=D.admin.ai||{};D.admin.ai.model=$('adminGeminiModel').value;saveAll();toast('✓ Gemini AI configuration saved')};
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
  $('adminExport').onclick=()=>exportCloudPdf('Homework Reminder — Complete Firebase Cloud Data');
  $('adminExportRecords').onclick=async()=>{if(!await loadFreshCloudStudentsForExport())return;const a=filteredCloudAggregate(readAdminFilters('all'));const rows=[['Student','Email','Roll','Subject','Date','Day','Time','Chapter','Topic','Homework','Teacher','Status']];a.rows.forEach(x=>rows.push([x.studentName,x.email,x.roll,x.meta.subject,x.meta.date,x.meta.date?new Date(x.meta.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long'}):'',x.meta.time,x.record.chapter||'',x.record.topic||'',x.record.homework||'',x.record.teacher||'',x.record.homework?(x.record.completed?'Completed':'Pending'):'']));const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download='homework-reminder-all-cloud-records.csv';link.click();toast('✓ Cloud records CSV exported')};
  $('adminExportPdf').onclick=()=>exportCloudPdf('Homework Reminder — Complete Firebase Records PDF'); wireAdminFilter('all',()=>{});

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
// Keep the startup loading screen visible until both Firebase student and admin
// authentication states have been resolved. Only then show the login gate or open
// the restored session, avoiding a confusing login popup during the initial check.
CloudAPI.onAuthStateChanged(async user=>{
  cloudUser=user||null;
  studentAuthResolved=true;
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
    if(!adminUser&&!adminAuthInProgress){try{localStorage.removeItem(STUDENT_SESSION_HINT)}catch(_){}}
    if($('settings'))show('settings');
  }
  finishStartupAuthCheck();
});
CloudAPI.onAdminAuthStateChanged(async user=>{
  adminUser=user||null;
  adminAuthResolved=true;
  if(user&&!adminAuthInProgress){
    try{
      const allowed=await CloudAPI.isAdmin(user.uid);
      if(allowed){
        adminSession=true;
        finishStartupAuthCheck();
        closeStartupAuth();
        show('admin');
        return;
      }
      await CloudAPI.adminSignOut();
    }catch(e){console.warn('Admin session verification failed',e)}
  }
  if(!user){
    adminSession=false;
  }
  finishStartupAuthCheck();
});
window.addEventListener('online',()=>{toast('Back online — syncing…');if(cloudUser)syncCurrentUser('upload',true)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cloudUser){startAutomaticCloudSync();syncCurrentUser('upload',true)}});
window.addEventListener('pagehide',()=>{if(cloudUser&&!suppressCloudQueue)syncCurrentUser('upload',true)});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
