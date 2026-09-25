import { onDisconnect, onValue, ref, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { auth, db } from "./firebase.js";

export function startPresence(roomCode, { onConnectionChange } = {}) {
  let active = true;
  const unsubscribe = onValue(ref(db, ".info/connected"), async snapshot => {
    const online = snapshot.val() === true;
    onConnectionChange?.(online);
    if (!online || !active || !auth.currentUser) return;
    const playerRef = ref(db, `rooms/${roomCode}/players/${auth.currentUser.uid}`);
    try {
      await onDisconnect(playerRef).update({ connected: false, lastSeen: serverTimestamp() });
      if (active) await update(playerRef, { connected: true, lastSeen: serverTimestamp() });
    } catch (error) { console.error("Presence error:", error); }
  });
  return () => { active = false; unsubscribe(); };
}

export async function markSelfOffline(roomCode) {
  if (!auth.currentUser) return;
  await update(ref(db, `rooms/${roomCode}/players/${auth.currentUser.uid}`), { connected: false, lastSeen: serverTimestamp() });
}
