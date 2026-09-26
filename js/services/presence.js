import { onDisconnect, onValue, ref, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { auth, db } from "./firebase.js";

export function startPresence(roomCode, { onConnectionChange } = {}) {
  let active = true;
  let heartbeat = null;
  let disconnectRegistration = null;
  const unsubscribe = onValue(ref(db, ".info/connected"), async snapshot => {
    const online = snapshot.val() === true;
    onConnectionChange?.(online);
    clearInterval(heartbeat);
    heartbeat = null;
    if (!online || !active || !auth.currentUser) return;
    const playerRef = ref(db, `rooms/${roomCode}/players/${auth.currentUser.uid}`);
    try {
      disconnectRegistration = onDisconnect(playerRef);
      await disconnectRegistration.update({ connected: false, lastSeen: serverTimestamp() });
      const touch = () => active && update(playerRef, { connected: true, lastSeen: serverTimestamp() }).catch(error => console.error("Presence heartbeat:", error));
      await touch();
      heartbeat = setInterval(touch, 5000);
    } catch (error) { console.error("Presence error:", error); }
  });
  return () => {
    active = false;
    clearInterval(heartbeat);
    disconnectRegistration?.cancel().catch(error => console.error("Presence cleanup:", error));
    unsubscribe();
  };
}

export async function markSelfOffline(roomCode) {
  if (!auth.currentUser) return;
  await update(ref(db, `rooms/${roomCode}/players/${auth.currentUser.uid}`), { connected: false, lastSeen: serverTimestamp() });
}
