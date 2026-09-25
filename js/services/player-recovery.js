import { get, ref, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { db, ensureAnonymousUser } from "./firebase.js";
import { normalizeArray } from "../core/game-state.js";

export async function removeDisconnectedPlayer(roomCode, targetUid) {
  const user = await ensureAnonymousUser();
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  if (!snapshot.exists()) throw new Error("Комната не существует.");
  const room = snapshot.val();
  if (room.meta?.hostId !== user.uid) throw new Error("Удалять игроков может только хост.");
  const target = room.players?.[targetUid];
  if (!target) return;
  if (target.connected !== false) throw new Error("Игрок снова подключился.");
  if (room.meta?.phase === "RESULTS") throw new Error("Сначала начните следующий кон, затем удалите игрока.");
  const oldOrder = normalizeArray(room.meta?.turnOrder);
  const newOrder = oldOrder.filter(uid => uid !== targetUid);
  const remaining = Object.keys(room.players ?? {}).filter(uid => uid !== targetUid);
  const updates = {
    [`rooms/${roomCode}/players/${targetUid}`]: null,
    [`rooms/${roomCode}/colorClaims/${target.colorId}`]: null,
    [`rooms/${roomCode}/round/ready`]: null,
    [`rooms/${roomCode}/round/error`]: "Игрок покинул игру. Кон перезапущен.",
    [`rooms/${roomCode}/endVote`]: null,
    [`roomSecrets/${roomCode}/submissions`]: null,
    [`rooms/${roomCode}/meta/playerCount`]: remaining.length
  };
  if (remaining.length < 3) {
    updates[`rooms/${roomCode}/meta/roundNumber`] = Math.max(0, Number(room.meta?.roundNumber ?? 1) - 1);
    updates[`rooms/${roomCode}/meta/status`] = "finished";
    updates[`rooms/${roomCode}/meta/phase`] = "FINISHED";
    updates[`rooms/${roomCode}/meta/finishedAt`] = serverTimestamp();
    updates[`rooms/${roomCode}/meta/endReason`] = "not_enough_players";
  } else {
    updates[`rooms/${roomCode}/meta/turnOrder`] = newOrder;
    updates[`rooms/${roomCode}/meta/phase`] = "ROUND_INPUT";
    if (room.meta?.leaderId === targetUid) updates[`rooms/${roomCode}/meta/leaderId`] = nextRemaining(oldOrder, targetUid, new Set(remaining));
  }
  await update(ref(db), updates);
}

function nextRemaining(order, removedUid, remaining) {
  const index = order.indexOf(removedUid);
  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidate = order[(Math.max(index, 0) + offset) % order.length];
    if (remaining.has(candidate)) return candidate;
  }
  return [...remaining][0] ?? "";
}
