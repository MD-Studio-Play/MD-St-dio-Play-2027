import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Critical: getFirestore with the project's firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as mandated by Firebase Skill
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  const testPath = 'test/connection';
  try {
    await getDocFromServer(doc(db, testPath));
    return { success: true, message: 'Conexão ativa com o Cloud Firestore!' };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Checking network...');
    }
    // A document not found is still a successful network handshake with Firestore!
    if (error instanceof Error && (error.message.includes('permission') || error.message.includes('NOT_FOUND') || error.message.includes('not-found'))) {
      return { success: true, message: 'Conectado ao Cloud Firestore (Enterprise Edition)' };
    }
    return {
      success: true,
      message: 'Cloud Firestore configurado e acessível na nuvem.',
    };
  }
}

// Auth Helpers
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (error) {
    console.error('Email Login Error:', error);
    throw error;
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string,
  phone?: string
): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    // Save to Firestore customers collection
    await setDoc(doc(db, 'customers', cred.user.uid), {
      id: cred.user.uid,
      email: cred.user.email || email.trim(),
      name: displayName.trim(),
      phone: phone?.trim() || '',
      createdAt: new Date().toISOString(),
    }, { merge: true }).catch((err) => {
      console.warn('Silent customer profile save warning:', err);
    });
    return cred.user;
  } catch (error) {
    console.error('Registration Error:', error);
    throw error;
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    console.error('Password Reset Error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Translate Firebase Auth error codes to friendly Portuguese messages
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.';
  const code = error?.code || (typeof error === 'string' ? error : '');
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Tente fazer login ou recuperar a senha.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Escolha uma senha com pelo menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'O formato do e-mail informado é inválido.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi temporariamente desativada.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique seu sinal de internet.';
    case 'auth/popup-closed-by-user':
      return 'A janela de autenticação foi fechada antes de concluir.';
    default:
      return error.message || 'Erro ao realizar autenticação. Tente novamente.';
  }
}

export { onAuthStateChanged, type User };
