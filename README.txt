Classwork–Homework Planner — v40 Firebase Edition

Baseline: v40 UI/functionality. Firebase integration added without changing the core planner workflow.

Firebase project:
  classwork-homework-planner

Integrated services:
  - Firebase Authentication (Email/Password)
  - Cloud Firestore
  - Student cloud sync
  - Firebase-protected Admin Dashboard
  - Admin can view cloud students and their classwork/homework/syllabus in-app

Files:
  firebase.js       Firebase Web SDK configuration and cloud data service
  firestore.rules   Security rules to paste into Firebase Console

IMPORTANT SETUP AFTER UPLOADING THE APP
1. Firebase Console → Authentication → Users → Add user. Create the administrator email/password.
2. Copy that user's Firebase UID.
3. Firestore Database → Data → Start collection → collection ID: admins.
4. Document ID: paste the admin Firebase UID exactly.
5. Add field: active (boolean) = true.
6. Publish the included firestore.rules in Firestore → Rules.
7. Student accounts can then be created from the app's Settings → Firebase Cloud Account.

Student data is stored under users/{uid}. The app never uploads the local admin configuration/API key into student documents.

The web Firebase API key in firebase.js is a client configuration value. Never add a Firebase service-account private key to the web app.
