import { getColorValue } from "./core/colors.js";
import { getNextLeaderId, normalizeArray, normalizeSubmissions, getEndVoteCounts } from "./core/game-state.js";
import { calculateRound, RoundValidationError } from "./core/scoring.js";
import { getRequiredOwnCardCount } from "./core/validation.js";
import { ensureAnonymousUser, isFirebaseConfigured } from "./services/firebase.js";
import { createRoom, joinRoom, leaveLobby, startRoomGame, subscribeRoom } from "./services/rooms.js";
import { advanceRound, normalizeSubmission, promoteReadyToReveal, publishRoundResult, readAllSubmissions, resetInvalidRound, submitRoundChoice, subscribeMySubmission } from "./services/rounds.js";
import { clearRoomSession, loadProfile, loadRoomSession, saveProfile, saveRoomSession } from "./services/session.js";
import { clearDraft, loadDraft, saveDraft } from "./services/draft-cache.js";
import { markSelfOffline, startPresence } from "./services/presence.js";
import { claimHostIfOffline } from "./services/host-recovery.js";
import { removeDisconnectedPlayer } from "./services/player-recovery.js";
import { castEndVote, finishGame, rejectEndVote, startEndVote } from "./services/end-game.js";
import { renderHome } from "./ui/home.js";
import { renderLobby } from "./ui/lobby.js";
import { renderGame } from "./ui/game.js";
import { renderResults } from "./ui/results.js";
import { renderFinal } from "./ui/final.js";
import { animateBoardMovements } from "./ui/board-animation.js";

const app = document.querySelector("#app");
const emptyDraft = () => ({ ownCards: [], vote: null });
const state = {
  screen: "loading", busy: false, error: null, connectionOnline: true,
  userId: null, roomCode: null, room: null, profile: loadProfile(), copyFeedback: false,
  players: [], turnOrder: [], roundNumber: 0, leaderId: null, phase: "LOBBY",
  round: { ready: {}, result: null, error: null }, endVote: null,
  draft: emptyDraft(), draftDirty: false, mySubmission: null, draftKey: null
};

let unsubscribeRoom = null;
let unsubscribeSubmission = null;
let unsubscribePresence = null;
let hostRecoveryTimer = null;
let endVoteResolutionInFlight = false;
const operationLocks = new Set();

function render() {
  if (state.screen === "loading") app.innerHTML = `<main class="app loading"><section class="panel panel-padding loading-card">Подключаемся…</section></main>`;
  else if (state.screen === "home") app.innerHTML = renderHome(state);
  else if (state.screen === "lobby") app.innerHTML = renderLobby(state);
  else if (state.screen === "game") app.innerHTML = renderGame(state);
  else if (state.screen === "results") app.innerHTML = renderResults(state);
  else app.innerHTML = renderFinal(state);
  if (!state.connectionOnline && state.screen !== "home" && state.screen !== "loading") app.insertAdjacentHTML("afterbegin", `<div class="connection-warning">Нет соединения с сервером. Игра восстановится после подключения.</div>`);
  if (state.screen === "results") requestAnimationFrame(() => animateBoardMovements(app));
}

function stopSubscriptions() {
  unsubscribeRoom?.(); unsubscribeSubmission?.(); unsubscribePresence?.();
  unsubscribeRoom = null; unsubscribeSubmission = null; unsubscribePresence = null;
  clearTimeout(hostRecoveryTimer); hostRecoveryTimer = null;
}

async function withLock(key, operation) {
  if (operationLocks.has(key)) return;
  operationLocks.add(key); state.busy = true; state.error = null; render();
  try { await operation(); }
  catch (error) { state.error = friendlyError(error); }
  finally { operationLocks.delete(key); state.busy = false; render(); }
}

function friendlyError(error) {
  console.error(error);
  if (error?.code === "PERMISSION_DENIED" || error?.code === "permission-denied") return "Операция отклонена правилами доступа. Обновите страницу и попробуйте снова.";
  return error?.message || "Не удалось выполнить действие.";
}

async function connectToRoom(roomCode) {
  stopSubscriptions();
  const user = await ensureAnonymousUser();
  state.userId = user.uid; state.roomCode = roomCode; state.error = null;
  saveRoomSession(roomCode);
  unsubscribeRoom = subscribeRoom(roomCode, applyRemoteRoom, error => { state.error = friendlyError(error); render(); });
  unsubscribeSubmission = subscribeMySubmission(roomCode, raw => {
    state.mySubmission = normalizeSubmission(raw);
    if (state.mySubmission) { state.draft = { ...state.mySubmission, ownCards: [...state.mySubmission.ownCards] }; state.draftDirty = false; }
    render();
  }, error => { state.error = friendlyError(error); render(); });
  unsubscribePresence = startPresence(roomCode, { onConnectionChange: online => { state.connectionOnline = online; render(); } });
}

function applyRemoteRoom(room) {
  if (!room || !room.players?.[state.userId]) {
    stopSubscriptions(); clearRoomSession(); Object.assign(state, { screen: "home", room: null, roomCode: null, error: room ? "Вы больше не участвуете в этой комнате." : "Комната больше не существует." }); render(); return;
  }
  const previousRound = state.roundNumber;
  state.room = room;
  state.turnOrder = normalizeArray(room.meta?.turnOrder);
  state.roundNumber = Number(room.meta?.roundNumber ?? 0);
  state.leaderId = room.meta?.leaderId || null;
  state.phase = room.meta?.phase ?? "LOBBY";
  state.round = { ready: room.round?.ready ?? {}, result: room.round?.result ?? null, error: room.round?.error ?? null };
  state.endVote = room.endVote ?? null;
  state.players = Object.entries(room.players ?? {}).map(([id, player]) => ({ id, name: String(player.name ?? "Игрок"), colorId: player.colorId, color: getColorValue(player.colorId), progress: Number(player.progress ?? 0), connected: player.connected === true, isHost: room.meta?.hostId === id, joinedAt: player.joinedAt ?? 0 }));
  const key = `${state.roomCode}:${state.roundNumber}:${state.userId}`;
  if (previousRound !== state.roundNumber) { state.mySubmission = null; state.draftDirty = false; }
  if (state.phase === "ROUND_INPUT" && state.round.ready?.[state.userId] !== true && !state.mySubmission && !state.draftDirty && state.draftKey !== key) {
    state.draft = loadDraft(state.roomCode, state.roundNumber, state.userId) ?? emptyDraft();
    state.draftKey = key;
  }
  if (room.meta?.status === "finished" || state.phase === "FINISHED") state.screen = "finished";
  else if (room.meta?.status === "lobby") state.screen = "lobby";
  else if (state.phase === "RESULTS") state.screen = "results";
  else state.screen = "game";
  render();
  scheduleHostRecovery();
  if (state.phase === "ROUND_INPUT" && state.userId === state.leaderId && state.players.length && state.players.every(player => state.round.ready?.[player.id] === true)) void withLock("promote-ready", () => promoteReadyToReveal(state.roomCode));
  void maybeResolveEndVote();
}

function scheduleHostRecovery() {
  clearTimeout(hostRecoveryTimer); hostRecoveryTimer = null;
  if (!state.room || state.phase === "FINISHED") return;
  const host = state.players.find(player => player.isHost);
  if (!host || host.connected !== false) return;
  hostRecoveryTimer = setTimeout(() => claimHostIfOffline(state.roomCode).catch(error => console.error("Host recovery:", error)), 10000);
}

async function maybeResolveEndVote() {
  const me = state.players.find(player => player.id === state.userId);
  if (endVoteResolutionInFlight || state.phase !== "RESULTS" || !state.endVote?.active || !me?.isHost) return;
  const counts = getEndVoteCounts(state.players.map(player => player.id), state.endVote.votes ?? {});
  endVoteResolutionInFlight = true;
  try {
    if (counts.yes >= counts.required) await finishGame(state.roomCode);
    else if (counts.cast === state.players.length) await rejectEndVote(state.roomCode);
  } catch (error) { console.error(error); }
  finally { endVoteResolutionInFlight = false; }
}

function saveCurrentDraft() {
  state.draftDirty = true;
  saveDraft(state.roomCode, state.roundNumber, state.userId, state.draft);
}

function chooseOwnCard(card) {
  if (state.phase !== "ROUND_INPUT" || state.round.ready?.[state.userId]) return;
  const required = getRequiredOwnCardCount(state.players.length, state.userId, state.leaderId);
  const selected = state.draft.ownCards.includes(card);
  if (selected) state.draft.ownCards = state.draft.ownCards.filter(value => value !== card);
  else if (required === 1) state.draft.ownCards = [card];
  else if (state.draft.ownCards.length < required) state.draft.ownCards = [...state.draft.ownCards, card].sort((a,b) => a-b);
  if (state.draft.ownCards.includes(state.draft.vote)) state.draft.vote = null;
  saveCurrentDraft(); render();
}

function chooseVote(card) {
  if (state.phase !== "ROUND_INPUT" || state.userId === state.leaderId || state.round.ready?.[state.userId] || state.draft.ownCards.includes(card)) return;
  state.draft.vote = card; saveCurrentDraft(); render();
}

async function submitCurrentChoice() {
  const required = getRequiredOwnCardCount(state.players.length, state.userId, state.leaderId);
  if (state.draft.ownCards.length !== required) return;
  if (state.userId !== state.leaderId && !Number.isInteger(state.draft.vote)) return;
  await submitRoundChoice(state.roomCode, state.draft);
  clearDraft(state.roomCode, state.roundNumber, state.userId);
  state.draftDirty = false;
}

async function revealCurrentRound() {
  if (state.userId !== state.leaderId) return;
  try {
    const raw = await readAllSubmissions(state.roomCode);
    const result = calculateRound({ playerIds: state.players.map(player => player.id), leaderId: state.leaderId, submissions: normalizeSubmissions(raw) });
    await publishRoundResult(state.roomCode, result);
  } catch (error) {
    if (error instanceof RoundValidationError) { await resetInvalidRound(state.roomCode); return; }
    throw error;
  }
}

async function nextRound() {
  const me = state.players.find(player => player.id === state.userId);
  if (!me?.isHost || !state.round.result) return;
  await advanceRound(state.roomCode, { nextLeaderId: getNextLeaderId(state.turnOrder, state.leaderId), nextRoundNumber: state.roundNumber + 1 });
}

async function leaveCurrentRoom() {
  const inLobby = state.room?.meta?.status === "lobby";
  if (inLobby) await leaveLobby(state.roomCode);
  else if (state.roomCode) await markSelfOffline(state.roomCode);
  stopSubscriptions(); clearRoomSession(); Object.assign(state, { screen: "home", room: null, roomCode: null, players: [], error: null });
}

app.addEventListener("input", event => {
  if (event.target.dataset.control === "player-name") { state.profile.name = event.target.value; saveProfile(state.profile); }
});

app.addEventListener("submit", event => {
  if (event.target.dataset.form !== "join-room") return;
  event.preventDefault();
  const roomCode = new FormData(event.target).get("roomCode");
  void withLock("join-room", async () => { const code = await joinRoom({ roomCode, ...state.profile }); await connectToRoom(code); });
});

app.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "select-color") { state.profile.colorId = target.dataset.color; saveProfile(state.profile); render(); }
  else if (action === "create-room") void withLock("create-room", async () => { const code = await createRoom(state.profile); await connectToRoom(code); });
  else if (action === "copy-room-code") void navigator.clipboard.writeText(state.roomCode).then(() => { state.copyFeedback = true; render(); setTimeout(() => { state.copyFeedback = false; render(); }, 1200); }).catch(() => {});
  else if (action === "start-game") void withLock("start-game", () => startRoomGame(state.roomCode));
  else if (action === "choose-own-card") chooseOwnCard(Number(target.dataset.card));
  else if (action === "choose-vote") chooseVote(Number(target.dataset.card));
  else if (action === "submit-choice") void withLock("submit-choice", submitCurrentChoice);
  else if (action === "reveal-results") void withLock("reveal-results", revealCurrentRound);
  else if (action === "next-round") void withLock("next-round", nextRound);
  else if (action === "start-end-vote") void withLock("start-end-vote", () => startEndVote(state.roomCode));
  else if (action === "end-vote-yes") void withLock("end-vote", () => castEndVote(state.roomCode, true));
  else if (action === "end-vote-no") void withLock("end-vote", () => castEndVote(state.roomCode, false));
  else if (action === "remove-player") void withLock(`remove-${target.dataset.playerId}`, () => removeDisconnectedPlayer(state.roomCode, target.dataset.playerId));
  else if (action === "leave-room") void withLock("leave-room", leaveCurrentRoom);
});

async function bootstrap() {
  if (!isFirebaseConfigured) { state.screen = "home"; state.error = "Firebase ещё не подключён. Локальная сборка готова к настройке."; render(); return; }
  try {
    const user = await ensureAnonymousUser(); state.userId = user.uid;
    const session = loadRoomSession();
    if (session?.roomCode) await connectToRoom(session.roomCode);
    else { state.screen = "home"; render(); }
  } catch (error) { state.screen = "home"; state.error = friendlyError(error); render(); }
}

void bootstrap();
