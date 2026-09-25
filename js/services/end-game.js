import { get, ref, remove, runTransaction, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { db, ensureAnonymousUser } from "./firebase.js";
import { getEndVoteCounts } from "../core/game-state.js";

export async function startEndVote(roomCode) {
  const user = await ensureAnonymousUser();
  const result = await runTransaction(ref(db, `rooms/${roomCode}/endVote`), current => current?.active ? undefined : { active: true, requestedBy: user.uid, openedAt: Date.now() }, { applyLocally: false });
  if (result.committed || result.snapshot.val()?.active) {
    await update(ref(db, `rooms/${roomCode}/endVote/votes`), { [user.uid]: true });
  }
  return result.committed;
}

export async function castEndVote(roomCode, vote) {
  const user = await ensureAnonymousUser();
  await update(ref(db, `rooms/${roomCode}/endVote/votes`), { [user.uid]: Boolean(vote) });
}

async function requireHost(roomCode, uid) {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  if (!snapshot.exists()) throw new Error("Комната не существует.");
  const room = snapshot.val();
  if (room.meta?.hostId !== uid) throw new Error("Действие доступно только хосту.");
  return room;
}

export async function rejectEndVote(roomCode) {
  const user = await ensureAnonymousUser();
  const room = await requireHost(roomCode, user.uid);
  if (room.meta?.phase !== "RESULTS") return;
  await update(ref(db, `rooms/${roomCode}/endVote`), { active: false, outcome: "rejected" });
}

export async function finishGame(roomCode) {
  const user = await ensureAnonymousUser();
  const room = await requireHost(roomCode, user.uid);
  if (room.meta?.phase !== "RESULTS") throw new Error("Завершить игру можно только между конами.");
  const playerIds = Object.keys(room.players ?? {});
  const counts = getEndVoteCounts(playerIds, room.endVote?.votes ?? {});
  if (counts.yes < counts.required) throw new Error("Большинство ещё не проголосовало за завершение.");
  const result = room.round?.result;
  if (!result?.baseProgress || !result?.deltas) throw new Error("Отсутствует результат текущего кона.");
  const updates = {
    [`rooms/${roomCode}/meta/status`]: "finished",
    [`rooms/${roomCode}/meta/phase`]: "FINISHED",
    [`rooms/${roomCode}/meta/finishedAt`]: serverTimestamp(),
    [`rooms/${roomCode}/meta/endReason`]: "vote",
    [`rooms/${roomCode}/endVote/active`]: false,
    [`rooms/${roomCode}/endVote/outcome`]: "approved"
  };
  for (const uid of playerIds) updates[`rooms/${roomCode}/players/${uid}/progress`] = Number(result.baseProgress[uid] ?? 0) + Number(result.deltas[uid] ?? 0);
  await remove(ref(db, `roomSecrets/${roomCode}/submissions`));
  await update(ref(db), updates);
}
