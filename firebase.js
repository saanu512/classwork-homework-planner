import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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
export const db = getFirestore(app);

const cleanForCloud = data => {
  const x = JSON.parse(JSON.stringify(data || {}));
  delete x.admin;
  delete x._savedAt;
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
    return snap.exists() ? snap.data() : null;
  },
  async saveUserData(uid,data){
    await setDoc(doc(db,'users',uid), {...cleanForCloud(data), uid, updatedAt: serverTimestamp()}, {merge:true});
  },
  async isAdmin(uid){
    if(!uid) return false;
    const snap = await getDoc(doc(db,'admins',uid));
    return snap.exists() && snap.data().active !== false;
  },
  async getAllStudents(){
    const snap = await getDocs(collection(db,'users'));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }
};
