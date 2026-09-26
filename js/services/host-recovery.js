import { get, ref, runTransaction } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { db, ensureAnonymousUser } from "./firebase.js";
import { normalizeArray } from "../core/game-state.js";

export async function claimHostIfOffline(roomCode) {
  const user = await ensureAnonymousUser();
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  if (!snapshot.exists()) return false;
  const room = snapshot.val();
  const oldHost = room.meta?.hostId;
  const oldHostPlayer = room.players?.[oldHost];
  const lastSeen = Number(oldHostPlayer?.lastSeen ?? 0);
  if (!oldHost || oldHost === user.uid || oldHostPlayer?.connected !== false || Date.now() - lastSeen < 15000 || room.players?.[user.uid]?.connected !== true) return false;
  const order = normalizeArray(room.meta?.turnOrder);
  const fallback = Object.entries(room.players ?? {}).sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)).map(([uid]) => uid);
  const nextHost = (order.length ? order : fallback).find(uid => room.players?.[uid]?.connected === true);
  if (nextHost !== user.uid) return false;
  const transaction = await runTransaction(ref(db, `rooms/${roomCode}/meta/hostId`), current => current === oldHost ? user.uid : undefined, { applyLocally: false });
  return transaction.committed;
}
