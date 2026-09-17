import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { initializeFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAQfUozDP7xyeZEl15DthoiAI_q05J2ZCM",
  authDomain: "classwork-homework-planner.firebaseapp.com",
  projectId: "classwork-homework-planner",
  storageBucket: "classwork-homework-planner.firebasestorage.app",
  messagingSenderId: "875081484430",
  appId: "1:875081484430:web:66a2e7b38a1f1faede21df"
};

export const app = initializeApp(firebaseConfig);

// Firebase AI Logic is protected by Firebase App Check. The reCAPTCHA Enterprise
// site key is public client configuration (not a secret API key). App Check must
// be initialized before Firebase services are used, and tokens must auto-refresh
// so Gemini requests continue working after the App Check TTL expires.
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6Lfv4r4tAAAAAIhg3alkHwgcJIJ2ht-pz01OTBxE"),
  isTokenAutoRefreshEnabled: true
});

// Firebase AI Logic keeps Gemini authorization on the Firebase/Google side;
// no Gemini Developer API key is embedded in this PWA. Limited-use App Check
// tokens are enabled for replay-protected AI requests.
export const firebaseAI = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
export const auth = getAuth(app);
// Persist the student Firebase session across app restarts.
setPersistence(auth, browserLocalPersistence).catch(e => console.warn("Student auth persistence setup failed", e));
// Separate Firebase app/auth session for administrators. This keeps the admin
// login completely independent from the student's Firebase session.
export const adminApp = initializeApp(firebaseConfig, 'adminApp');
export const adminAuth = getAuth(adminApp);
setPersistence(adminAuth, browserLocalPersistence).catch(e => console.warn("Admin auth persistence setup failed", e));
// Ignore accidental undefined fields instead of rejecting an otherwise valid sync.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const adminDb = initializeFirestore(adminApp, { ignoreUndefinedProperties: true });
export const adminFunctions = getFunctions(adminApp);

// Firestore does not support arrays directly inside arrays.
// The app's schedule uses [start, end, subject] rows, so encode those
// nested arrays for cloud storage and decode them when loading.
const encodeSchedule = schedule => {
  if(!schedule || typeof schedule !== 'object') return schedule || {};
  const out = {};
  Object.keys(schedule).forEach(day => {
    const rows = Array.isArray(schedule[day]) ? schedule[day] : [];
    out[day] = rows.map(row => ({
      start: row?.[0] ?? '',
      end: row?.[1] ?? '',
      subject: row?.[2] ?? ''
    }));
  });
  return out;
};

const decodeSchedule = schedule => {
  if(!schedule || typeof schedule !== 'object') return schedule || {};
  const out = {};
  Object.keys(schedule).forEach(day => {
    const rows = Array.isArray(schedule[day]) ? schedule[day] : [];
    out[day] = rows.map(row => [
      row?.start ?? row?.[0] ?? '',
      row?.end ?? row?.[1] ?? '',
      row?.subject ?? row?.[2] ?? ''
    ]);
  });
  return out;
};

const cleanForCloud = data => {
  const x = JSON.parse(JSON.stringify(data || {}));
  delete x.admin;
  delete x._savedAt;
  delete x.role;
  delete x.isAdmin;
  delete x.permissions;
  delete x.adminPermissions;

  if(x.schedule) x.schedule = encodeSchedule(x.schedule);
  if(Array.isArray(x.changes)){
    x.changes = x.changes.map(change => ({
      ...change,
      schedule: change?.schedule ? encodeSchedule(change.schedule) : change?.schedule
    }));
  }
  return x;
};

const decodeCloudData = data => {
  const x = JSON.parse(JSON.stringify(data || {}));
  if(x.schedule) x.schedule = decodeSchedule(x.schedule);
  if(Array.isArray(x.changes)){
    x.changes = x.changes.map(change => ({
      ...change,
      schedule: change?.schedule ? decodeSchedule(change.schedule) : change?.schedule
    }));
  }
  return x;
};

const sendPasswordReset = async email => {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({requestType:'PASSWORD_RESET', email})
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok){
    const code = data?.error?.message || 'PASSWORD_RESET_FAILED';
    const err = new Error(code); err.code = code; throw err;
  }
  return data;
};

export const GeminiAPI = {
  async generate(prompt, modelName = 'gemini-3.8-flash') {
    // Firebase AI Logic handles App Check tokens internally. Do not make a
    // separate getToken() call here; with limited-use tokens enabled, the SDK
    // obtains the appropriate token for the AI request itself.
    const model = getGenerativeModel(firebaseAI, {
      model: modelName
    }, {
      // Use the SDK request timeout so Firebase can return its actual error
      // instead of our old Promise.race masking it as a generic timeout.
      timeout: 60000
    });
    try {
      const result = await model.generateContent(prompt);
      return result?.response?.text?.() || 'No answer returned.';
    } catch (e) {
      const err = new Error(e?.message || 'Gemini request failed');
      err.code = e?.code || '';
      err.cause = e;
      console.error('Gemini AI request failed:', e);
      throw err;
    }
  }
};

export const CloudAPI = {
  auth, db, adminAuth, adminDb,
  onAuthStateChanged: cb => onAuthStateChanged(auth, cb),
  onAdminAuthStateChanged: cb => onAuthStateChanged(adminAuth, cb),
  signIn: (email,password) => signInWithEmailAndPassword(auth,email,password),
  signUp: (email,password) => createUserWithEmailAndPassword(auth,email,password),
  resetPassword: email => sendPasswordReset(email),
  setPersistence: () => setPersistence(auth, browserLocalPersistence),
  adminSetPersistence: () => setPersistence(adminAuth, browserLocalPersistence),
  signOut: () => signOut(auth),
  currentUser: () => auth.currentUser,
  adminSignIn: (email,password) => signInWithEmailAndPassword(adminAuth,email,password),
  adminResetPassword: email => sendPasswordReset(email),
  adminSignOut: () => signOut(adminAuth),
  adminCurrentUser: () => adminAuth.currentUser,
  async getUserData(uid){
    const snap = await getDoc(doc(db,'users',uid));
    return snap.exists() ? decodeCloudData(snap.data()) : null;
  },
  async saveUserData(uid,data){
    await setDoc(doc(db,'users',uid), {...cleanForCloud(data), uid, updatedAt: serverTimestamp()}, {merge:false});
  },
  async adminSaveUserData(uid,data){
    await setDoc(doc(adminDb,'users',uid), {...cleanForCloud(data), uid, updatedAt: serverTimestamp()}, {merge:false});
  },
  async isAdmin(uid){
    if(!uid) return false;
    const snap = await getDoc(doc(adminDb,'admins',uid));
    return snap.exists() && snap.data().role === 'admin';
  },
  async getAllStudents(){
    const snap = await getDocs(collection(adminDb,'users'));
    return snap.docs.map(d=>({id:d.id,...decodeCloudData(d.data())}));
  },
  async adminDeleteStudentAccount(uid){
    if(!uid) throw Object.assign(new Error('Missing student UID'),{code:'invalid-argument'});
    const call=httpsCallable(adminFunctions,'deleteStudentAccount');
    const res=await call({uid});
    return res?.data||{};
  }
};
