import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

import { firebaseConfig } from '../../../src/firebase/config';

export function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getDb() {
  return getFirestore(getFirebaseApp());
}

export async function authenticate() {
  const auth = getAuth(getFirebaseApp());
  const email = process.env.FIREBASE_USER;
  const password = process.env.FIREBASE_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'As credenciais do Firebase (FIREBASE_USER, FIREBASE_PASSWORD) não foram definidas no arquivo .env.'
    );
  }

  console.log(`🔑 Autenticando usuário: ${email}...`);
  await signInWithEmailAndPassword(auth, email, password);
  console.log('✅ Autenticado com sucesso!');
}
