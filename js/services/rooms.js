import { ref, get, onValue, remove, runTransaction, serverTimestamp, set, update } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { db, ensureAnonymousUser } from "./firebase.js";
import { isValidColorId } from "../core/colors.js";

function normalizeName(name) { return String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 24); }
function normalizeCode(code) { return String(code ?? "").replace(/\D/g, "").slice(0, 6); }
function generateRoomCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function claimColor(roomCode, colorId, uid) {
  const result = await runTransaction(ref(db, `rooms/${roomCode}/colorClaims/${colorId}`), current => current === null || current === uid ? uid : undefined, { applyLocally: false });
  return result.committed;
}

async function releaseColor(roomCode, colorId, uid) {
  await runTransaction(ref(db, `rooms/${roomCode}/colorClaims/${colorId}`), current => current === uid ? null : undefined, { applyLocally: false });
}

function validateProfile(name, colorId) {
  const safeName = normalizeName(name);
  if (!safeName) throw new Error("Введите имя игрока.");
  if (!isValidColorId(colorId)) throw new Error("Выберите доступный цвет.");
  return safeName;
}

export async function createRoom({ name, colorId }) {
  const user = await ensureAnonymousUser();
  const safeName = validateProfile(name, colorId);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const roomCode = generateRoomCode();
    const metaRef = ref(db, `rooms/${roomCode}/meta`);
    const creation = await runTransaction(metaRef, current => current === null ? {
      hostId: user.uid, status: "lobby", phase: "LOBBY", roundNumber: 0, playerCount: 0, leaderId: "", turnOrder: {}, createdAt: Date.now()
    } : undefined, { applyLocally: false });
    if (!creation.committed) continue;
    if (!await claimColor(roomCode, colorId, user.uid)) { await remove(metaRef); continue; }
    try {
      await set(ref(db, `rooms/${roomCode}/players/${user.uid}`), { name: safeName, colorId, progress: 0, joinedAt: serverTimestamp(), connected: true, lastSeen: serverTimestamp() });
      return roomCode;
    } catch (error) {
      await releaseColor(roomCode, colorId, user.uid);
      await remove(metaRef);
      throw error;
    }
  }
  throw new Error("Не удалось создать свободный код комнаты.");
}

export async function joinRoom({ roomCode, name, colorId }) {
  const user = await ensureAnonymousUser();
  const safeName = validateProfile(name, colorId);
  const code = normalizeCode(roomCode);
  if (code.length !== 6) throw new Error("Введите шестизначный код комнаты.");
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) throw new Error("Комната не найдена.");
  const room = snapshot.val();
  if (room.players?.[user.uid]) return code;
  if (room.meta?.status !== "lobby") throw new Error("Игра уже началась.");
  if (Object.keys(room.players ?? {}).length >= 6) throw new Error("Комната заполнена.");
  if (!await claimColor(code, colorId, user.uid)) throw new Error("Этот цвет уже занят.");
  try {
    await set(ref(db, `rooms/${code}/players/${user.uid}`), { name: safeName, colorId, progress: 0, joinedAt: serverTimestamp(), connected: true, lastSeen: serverTimestamp() });
    return code;
  } catch (error) { await releaseColor(code, colorId, user.uid); throw error; }
}

export function subscribeRoom(roomCode, onRoom, onError) {
  return onValue(ref(db, `rooms/${roomCode}`), snapshot => onRoom(snapshot.exists() ? snapshot.val() : null), onError);
}

export async function startRoomGame(roomCode) {
  const user = await ensureAnonymousUser();
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  if (!snapshot.exists()) throw new Error("Комната больше не существует.");
  const room = snapshot.val();
  if (room.meta?.hostId !== user.uid) throw new Error("Начать игру может только хост.");
  const players = Object.entries(room.players ?? {}).sort(([idA, a], [idB, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || idA.localeCompare(idB));
  if (players.length < 3 || players.length > 6) throw new Error("Для игры нужно от 3 до 6 игроков.");
  if (players.some(([, player]) => player.connected !== true)) throw new Error("Все игроки должны быть в сети.");
  const turnOrder = players.map(([uid]) => uid);
  await update(ref(db, `rooms/${roomCode}/meta`), { status: "playing", phase: "ROUND_INPUT", roundNumber: 1, playerCount: players.length, leaderId: turnOrder[0], turnOrder });
}

export async function leaveLobby(roomCode) {
  const user = await ensureAnonymousUser();
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  if (room.meta?.status !== "lobby") return;
  const current = room.players?.[user.uid];
  if (!current) return;
  if (room.meta.hostId === user.uid) {
    const updates = { [`rooms/${roomCode}/meta`]: null };
    for (const uid of Object.keys(room.players ?? {})) updates[`rooms/${roomCode}/players/${uid}`] = null;
    for (const color of Object.keys(room.colorClaims ?? {})) updates[`rooms/${roomCode}/colorClaims/${color}`] = null;
    await update(ref(db), updates);
  } else {
    await releaseColor(roomCode, current.colorId, user.uid);
    await remove(ref(db, `rooms/${roomCode}/players/${user.uid}`));
  }
}
