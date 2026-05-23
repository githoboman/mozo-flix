/**
 * lib/firebase.ts
 * Firebase init + Firestore helpers for off-chain data:
 * comments, likes, subscriptions, watch history, notifications.
 *
 * Add your Firebase project config to .env.local:
 *   NEXT_PUBLIC_FIREBASE_API_KEY=...
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
 *   NEXT_PUBLIC_FIREBASE_APP_ID=...
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  type Timestamp,
} from "firebase/firestore";

// ---------- Init ----------

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize when configured. When not configured the app object is
// null and callers should branch on `isFirebaseConfigured`.
const app = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
export const db = app ? getFirestore(app) : null;

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.local.",
    );
  }
  return db;
}

// ---------- Types ----------

export type Comment = {
  id?: string;
  videoId: string;
  author: string;       // wallet address
  displayName: string;
  body: string;
  parentId?: string;    // set for replies
  likes: number;
  createdAt: Timestamp | null;
};

export type Like = {
  videoId: string;
  viewer: string;       // wallet address
  type: "like" | "dislike";
};

export type Subscription = {
  viewer: string;       // wallet address
  channel: string;      // creator wallet address or handle
  createdAt: Timestamp | null;
};

export type WatchEntry = {
  viewer: string;
  videoId: string;
  progress: number;     // seconds watched
  duration: number;     // total seconds
  completedAt?: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type Notification = {
  id?: string;
  recipient: string;    // wallet address
  icon: string;
  title: string;
  body: string;
  unread: boolean;
  accent: boolean;
  createdAt: Timestamp | null;
};

// ---------- Comments ----------

export async function addComment(
  comment: Omit<Comment, "id" | "likes" | "createdAt">,
) {
  return addDoc(collection(requireDb(),"comments"), {
    ...comment,
    likes: 0,
    createdAt: serverTimestamp(),
  });
}

export async function getComments(videoId: string, parentId?: string) {
  const q = query(
    collection(requireDb(),"comments"),
    where("videoId", "==", videoId),
    where("parentId", "==", parentId ?? null),
    orderBy("createdAt", "desc"),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
}

export async function likeComment(commentId: string) {
  await updateDoc(doc(requireDb(),"comments", commentId), {
    likes: increment(1),
  });
}

export async function deleteComment(commentId: string) {
  await deleteDoc(doc(requireDb(),"comments", commentId));
}

// ---------- Video likes ----------

export async function setVideoLike(like: Like) {
  const id = `${like.viewer}_${like.videoId}`;
  await setDoc(doc(requireDb(),"likes", id), {
    ...like,
    createdAt: serverTimestamp(),
  });
}

export async function removeVideoLike(viewer: string, videoId: string) {
  await deleteDoc(doc(requireDb(),"likes", `${viewer}_${videoId}`));
}

export async function getVideoLike(
  viewer: string,
  videoId: string,
): Promise<Like | null> {
  const snap = await getDoc(doc(requireDb(),"likes", `${viewer}_${videoId}`));
  return snap.exists() ? (snap.data() as Like) : null;
}

// ---------- Subscriptions ----------

export async function subscribe(viewer: string, channel: string) {
  const id = `${viewer}_${channel}`;
  await setDoc(doc(requireDb(),"subscriptions", id), {
    viewer,
    channel,
    createdAt: serverTimestamp(),
  });
}

export async function unsubscribe(viewer: string, channel: string) {
  await deleteDoc(doc(requireDb(),"subscriptions", `${viewer}_${channel}`));
}

export async function isSubscribed(
  viewer: string,
  channel: string,
): Promise<boolean> {
  const snap = await getDoc(
    doc(requireDb(),"subscriptions", `${viewer}_${channel}`),
  );
  return snap.exists();
}

export async function getSubscriptions(viewer: string): Promise<string[]> {
  const q = query(
    collection(requireDb(),"subscriptions"),
    where("viewer", "==", viewer),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().channel as string);
}

// ---------- Watch history ----------

export async function upsertWatchEntry(entry: Omit<WatchEntry, "updatedAt">) {
  const id = `${entry.viewer}_${entry.videoId}`;
  await setDoc(
    doc(requireDb(),"watch_history", id),
    { ...entry, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function getWatchHistory(viewer: string): Promise<WatchEntry[]> {
  const q = query(
    collection(requireDb(),"watch_history"),
    where("viewer", "==", viewer),
    orderBy("updatedAt", "desc"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as WatchEntry);
}

export async function getWatchProgress(
  viewer: string,
  videoId: string,
): Promise<number> {
  const snap = await getDoc(
    doc(requireDb(),"watch_history", `${viewer}_${videoId}`),
  );
  return snap.exists() ? (snap.data().progress as number) : 0;
}

// ---------- Notifications ----------

export async function addNotification(
  n: Omit<Notification, "id" | "createdAt">,
) {
  return addDoc(collection(requireDb(),"notifications"), {
    ...n,
    createdAt: serverTimestamp(),
  });
}

export async function getNotifications(
  recipient: string,
): Promise<Notification[]> {
  const q = query(
    collection(requireDb(),"notifications"),
    where("recipient", "==", recipient),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
}

export async function markAllRead(recipient: string) {
  const notifs = await getNotifications(recipient);
  await Promise.all(
    notifs
      .filter((n) => n.unread)
      .map((n) =>
        updateDoc(doc(requireDb(),"notifications", n.id!), { unread: false }),
      ),
  );
}
