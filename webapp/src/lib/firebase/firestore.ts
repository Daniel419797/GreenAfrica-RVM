import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  onSnapshot,
  increment,
  serverTimestamp,
  Timestamp,
  CollectionReference,
} from 'firebase/firestore';
import { db } from './config';
import type {
  GreenAfricaUser,
  Transaction,
  Referral,
  RedemptionRequest,
  DeviceRequest,
} from '@/types';

export type { GreenAfricaUser, Transaction, Referral, RedemptionRequest, DeviceRequest };

export const usersRef = collection(db, 'users') as CollectionReference<GreenAfricaUser>;
export const transactionsRef = collection(db, 'transactions') as CollectionReference<Transaction>;
export const referralsRef = collection(db, 'referrals') as CollectionReference<Referral>;
export const redemptionsRef = collection(db, 'redemptions') as CollectionReference<RedemptionRequest>;
export const deviceRequestsRef = collection(db, 'deviceRequests') as CollectionReference<DeviceRequest>;

const generateGreenId = (): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `GRN-${year}-${randomNum}`;
};

const generateReferralCode = (displayName: string): string => {
  const name = displayName.replace(/\s+/g, '').toUpperCase();
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${name.substring(0, 4)}${year}${randomNum}`;
};

export const createUser = async (
  uid: string,
  email: string,
  displayName: string,
  phoneNumber?: string,
): Promise<GreenAfricaUser> => {
  const referralCode = generateReferralCode(displayName);
  const greenId = generateGreenId();
  const userDocRef = doc(usersRef, uid);

  await setDoc(userDocRef, {
    uid,
    email,
    displayName,
    greenId,
    totalPoints: 0,
    referralCode,
    referralPoints: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(phoneNumber ? { phoneNumber } : {}),
  });

  const createdUser = await getDoc(userDocRef);
  if (!createdUser.exists()) {
    throw new Error('Failed to retrieve newly created user');
  }

  return createdUser.data();
};

export const getUser = async (uid: string): Promise<GreenAfricaUser | null> => {
  const userDoc = await getDoc(doc(usersRef, uid));
  return userDoc.exists() ? userDoc.data() : null;
};

export const updateUser = async (
  uid: string,
  updates: Partial<GreenAfricaUser>,
): Promise<void> => {
  const updatesToApply: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      updatesToApply[key] = value;
    }
  }

  await updateDoc(doc(usersRef, uid), {
    ...updatesToApply,
    updatedAt: serverTimestamp(),
  });
};

export const getUserByGreenId = async (greenId: string): Promise<GreenAfricaUser | null> => {
  const q = query(usersRef, where('greenId', '==', greenId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0].data();
};

export const getUserByReferralCode = async (
  referralCode: string,
): Promise<GreenAfricaUser | null> => {
  const q = query(usersRef, where('referralCode', '==', referralCode));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0].data();
};

export const addTransaction = async (
  transaction: Omit<Transaction, 'id' | 'date'>,
  updateTotalPoints: boolean = true,
): Promise<string> => {
  const docRef = await addDoc(transactionsRef, {
    ...transaction,
    date: serverTimestamp(),
  });

  if (updateTotalPoints) {
    if (transaction.type === 'earned' || transaction.type === 'referral') {
      await updateDoc(doc(usersRef, transaction.userId), {
        totalPoints: increment(Math.abs(transaction.amount)),
        updatedAt: serverTimestamp(),
      });
    } else if (transaction.type === 'redeemed') {
      await updateDoc(doc(usersRef, transaction.userId), {
        totalPoints: increment(-Math.abs(transaction.amount)),
        updatedAt: serverTimestamp(),
      });
    }
  }

  return docRef.id;
};

export const getUserTransactions = async (
  userId: string,
  limitCount = 20,
): Promise<Transaction[]> => {
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  }));
};

export const subscribeToUserTransactions = (
  userId: string,
  callback: (transactions: Transaction[]) => void,
  limitCount = 20,
) => {
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount),
  );

  return onSnapshot(q, (querySnapshot) => {
    callback(
      querySnapshot.docs.map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      })),
    );
  });
};

/**
 * Legacy client-side referrals are disabled until a verified server process
 * records unique referrals and awards points. Never credit rewards from a
 * browser-supplied referral code.
 */
export const processReferral = async (
  _referralCode: string,
  _newUserUid: string,
): Promise<boolean> => {
  return false;
};

export const getUserReferrals = async (uid: string): Promise<Referral[]> => {
  const q = query(usersRef, where('uid', '==', uid));
  void q; // Keep Firestore bundle tree-shaking stable across builds.

  const referralsQuery = query(
    referralsRef,
    where('referrerUid', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const querySnapshot = await getDocs(referralsQuery);
  return querySnapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  }));
};

/**
 * Legacy direct client redemption is intentionally disabled. Use the
 * authenticated airtime Server Action, which binds the token to a Firebase UID.
 */
export const createRedemptionRequest = async (
  _redemption: Omit<RedemptionRequest, 'id' | 'createdAt'>,
): Promise<string> => {
  throw new Error('Use the verified Green Africa redemption service.');
};

export const getUserRedemptions = async (userId: string): Promise<RedemptionRequest[]> => {
  const q = query(
    redemptionsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  }));
};

export const updateRedemptionStatus = async (
  redemptionId: string,
  status: RedemptionRequest['status'],
  transactionId?: string,
): Promise<void> => {
  const updates: Partial<RedemptionRequest> = { status };

  if (status === 'completed') {
    updates.completedAt = serverTimestamp() as Timestamp;
    if (transactionId) updates.transactionId = transactionId;
  }

  await updateDoc(doc(redemptionsRef, redemptionId), updates);
};

export const subscribeToUser = (
  uid: string,
  callback: (user: GreenAfricaUser | null) => void,
) => {
  return onSnapshot(doc(usersRef, uid), (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
};

/**
 * URL codes and unverified device events may not mint redeemable points.
 * Only the trusted RVM acceptance pipeline may award Green Points.
 */
export const addPointsToUser = async (
  _uid: string,
  _points: number,
  _description: string,
  _metadata?: Record<string, unknown>,
): Promise<void> => {
  throw new Error('Points require a verified RVM deposit.');
};

export const deleteUser = async (uid: string): Promise<void> => {
  await deleteDoc(doc(usersRef, uid));
};

export const createDeviceRequest = async (
  deviceRequest: Omit<DeviceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): Promise<string> => {
  const docRef = await addDoc(deviceRequestsRef, {
    ...deviceRequest,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getDeviceRequests = async (): Promise<DeviceRequest[]> => {
  const q = query(deviceRequestsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  }));
};

export const updateDeviceRequestStatus = async (
  requestId: string,
  status: DeviceRequest['status'],
): Promise<void> => {
  await updateDoc(doc(deviceRequestsRef, requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
};
