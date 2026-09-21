import { initializeApp } from 'firebase/app';
import { collection, deleteDoc, getDocs, getFirestore } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollection(collectionName: string) {
  console.log(`Clearing ${collectionName}...`);
  const snapshot = await getDocs(collection(db, collectionName));

  await Promise.all(snapshot.docs.map((document) => deleteDoc(document.ref)));
  console.log(`Clearing ${collectionName}... done`);
}

async function clearDatabase() {
  await clearCollection('reports');
  await clearCollection('users');
  await clearCollection('kanban_cards');
  process.exit(0);
}

clearDatabase().catch((error: unknown) => {
  console.error('Failed to clear database:', error);
  process.exit(1);
});
