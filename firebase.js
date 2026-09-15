import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { initializeFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAQfUozDP7xyeZEl15DthoiAI_q05J2ZCM",
  authDomain: "classwork-homework-planner.firebaseapp.com",
  projectId: "classwork-homework-planner",
  storageBucket: "classwork-homework-planner.firebasestorage.app",
  messagingSenderId: "875081484430",
  appId: "1:875081484430:web:66a2e7b38a1f1faede21df"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Ignore accidental undefined fields instead of rejecting an otherwise valid sync.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

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

export const CloudAPI = {
  auth, db,
  onAuthStateChanged: cb => onAuthStateChanged(auth, cb),
  signIn: (email,password) => signInWithEmailAndPassword(auth,email,password),
  signUp: (email,password) => createUserWithEmailAndPassword(auth,email,password),
  signOut: () => signOut(auth),
  currentUser: () => auth.currentUser,
  async getUserData(uid){
    const snap = await getDoc(doc(db,'users',uid));
    return snap.exists() ? decodeCloudData(snap.data()) : null;
  },
  async saveUserData(uid,data){
    await setDoc(doc(db,'users',uid), {...cleanForCloud(data), uid, updatedAt: serverTimestamp()}, {merge:true});
  },
  async isAdmin(uid){
    if(!uid) return false;
    const snap = await getDoc(doc(db,'admins',uid));
    return snap.exists() && snap.data().role === 'admin';
  },
  async getAllStudents(){
    const snap = await getDocs(collection(db,'users'));
    return snap.docs.map(d=>({id:d.id,...decodeCloudData(d.data())}));
  }
};
