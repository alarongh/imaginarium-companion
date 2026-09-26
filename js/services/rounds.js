import { get, onValue, ref, remove, update } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { auth, db, ensureAnonymousUser } from "./firebase.js";
import { normalizeArray } from "../core/game-state.js";

function currentUid() {
  if (!auth?.currentUser) throw new Error("Пользователь не авторизован.");
  return auth.currentUser.uid;
}

async function requireRole(roomCode, uid, role) {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  if (!snapshot.exists()) throw new Error("Комната не существует.");
  const room = snapshot.val();
  const key = role === "leader" ? "leaderId" : "hostId";
  if (room.meta?.[key] !== uid) throw new Error(role === "leader" ? "Действие доступно только ведущему текущего кона." : "Действие доступно только хосту.");
  return room;
}

export function subscribeMySubmission(roomCode, onSubmission, onError) {
  const uid = currentUid();
  return onValue(ref(db, `roomSecrets/${roomCode}/submissions/${uid}`), snapshot => onSubmission(snapshot.exists() ? snapshot.val() : null), onError);
}

export async function submitRoundChoice(roomCode, { ownCards, vote }) {
  const user = await ensureAnonymousUser();
  const submission = { ownCards: [...ownCards].map(Number).sort((a, b) => a - b) };
  if (vote !== null && vote !== undefined) submission.vote = Number(vote);
  await update(ref(db), {
    [`roomSecrets/${roomCode}/submissions/${user.uid}`]: submission,
    [`rooms/${roomCode}/round/ready/${user.uid}`]: true
  });
}

export async function promoteReadyToReveal(roomCode) {
  const user = await ensureAnonymousUser();
  const room = await requireRole(roomCode, user.uid, "leader");
  if (room.meta?.phase !== "ROUND_INPUT") return false;
  const players = Object.keys(room.players ?? {});
  if (!players.length || !players.every(uid => room.round?.ready?.[uid] === true)) return false;
  await update(ref(db, `rooms/${roomCode}/meta`), { phase: "READY_TO_REVEAL" });
  return true;
}

export async function readAllSubmissions(roomCode) {
  const user = await ensureAnonymousUser();
  const room = await requireRole(roomCode, user.uid, "leader");
  if (room.meta?.phase !== "READY_TO_REVEAL") throw new Error("Кон ещё не готов к раскрытию.");
  const snapshot = await get(ref(db, `roomSecrets/${roomCode}/submissions`));
  return snapshot.exists() ? snapshot.val() : {};
}

export async function resetInvalidRound(roomCode) {
  const user = await ensureAnonymousUser();
  const room = await requireRole(roomCode, user.uid, "leader");
  if (room.meta?.phase !== "READY_TO_REVEAL") return;
  await update(ref(db), {
    [`rooms/${roomCode}/meta/phase`]: "ROUND_INPUT",
    [`rooms/${roomCode}/round/ready`]: null,
    [`rooms/${roomCode}/round/result`]: null,
    [`rooms/${roomCode}/round/error`]: "В распределении карт есть ошибка. Проверьте номера своих карт."
  });
}

export async function publishRoundResult(roomCode, result) {
  const user = await ensureAnonymousUser();
  const room = await requireRole(roomCode, user.uid, "leader");
  if (room.meta?.phase !== "READY_TO_REVEAL") throw new Error("Кон уже раскрыт или ещё не готов.");
  const baseProgress = Object.fromEntries(Object.entries(room.players ?? {}).map(([uid, player]) => [uid, Number(player.progress ?? 0)]));
  await update(ref(db), {
    [`rooms/${roomCode}/round/result`]: { ...result, baseProgress },
    [`rooms/${roomCode}/round/error`]: null,
    [`rooms/${roomCode}/meta/phase`]: "RESULTS"
  });
}

export async function advanceRound(roomCode, { nextLeaderId, nextRoundNumber }) {
  const user = await ensureAnonymousUser();
  const room = await requireRole(roomCode, user.uid, "host");
  if (room.meta?.phase !== "RESULTS") throw new Error("Текущий кон ещё не завершён.");
  if (room.endVote?.active) throw new Error("Сначала завершите голосование за окончание партии.");
  const result = room.round?.result;
  if (!result?.baseProgress || !result?.deltas) throw new Error("Результат текущего кона отсутствует.");
  const updates = {
    [`rooms/${roomCode}/meta/leaderId`]: nextLeaderId,
    [`rooms/${roomCode}/meta/roundNumber`]: nextRoundNumber,
    [`rooms/${roomCode}/meta/phase`]: "ROUND_INPUT",
    [`rooms/${roomCode}/round/ready`]: null,
    [`rooms/${roomCode}/round/result`]: null,
    [`rooms/${roomCode}/round/error`]: null,
    [`rooms/${roomCode}/endVote`]: null
  };
  for (const uid of Object.keys(room.players ?? {})) updates[`rooms/${roomCode}/players/${uid}/progress`] = Number(result.baseProgress[uid] ?? 0) + Number(result.deltas[uid] ?? 0);
  await remove(ref(db, `roomSecrets/${roomCode}/submissions`));
  await update(ref(db), updates);
}

export function normalizeSubmission(raw) {
  if (!raw) return null;
  return { ownCards: normalizeArray(raw.ownCards).map(Number), vote: raw.vote == null ? null : Number(raw.vote) };
}
