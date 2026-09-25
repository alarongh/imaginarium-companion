import { getCardCount, getRequiredOwnCardCount } from "../core/validation.js";
import { renderBoard } from "./board.js";
import { escapeHtml } from "./escape.js";

export function renderGame(state) {
  const current = state.players.find(player => player.id === state.userId);
  const leader = state.players.find(player => player.id === state.leaderId);
  if (!current || !leader) return `<main class="app"><div class="error-banner">Состояние комнаты обновляется…</div></main>`;
  const isLeader = current.id === leader.id;
  const ready = state.round.ready?.[current.id] === true;
  const submission = state.mySubmission ?? state.draft;
  const readyCount = state.players.filter(player => state.round.ready?.[player.id] === true).length;
  return `<div class="app page"><header class="game-header"><div><span class="badge badge-accent">Комната ${escapeHtml(state.roomCode)}</span><h1 class="game-title">Кон ${state.roundNumber}</h1></div><button class="button button-ghost" data-action="leave-room">Выйти</button></header>
    ${state.round.error ? `<div class="notice-banner">${escapeHtml(state.round.error)}</div>` : ""}${state.error ? `<div class="error-banner" role="alert">${escapeHtml(state.error)}</div>` : ""}
    <div class="game-layout"><section class="panel board-panel">${renderBoard(state)}</section><aside class="game-sidebar">${leaderCard(leader)}<section class="panel panel-padding">${roundPanel({ state, isLeader, ready, submission, readyCount })}</section>${positions(state)}</aside></div>
  </div>`;
}

function leaderCard(leader) { return `<section class="panel panel-padding leader-card"><div class="leader-piece" style="--leader-color:${leader.color}">${escapeHtml(leader.name.trim().charAt(0).toUpperCase() || "?")}</div><div><div class="leader-label">Ведущий кона</div><div class="leader-name">${escapeHtml(leader.name)}</div></div></section>`; }

function roundPanel({ state, isLeader, ready, submission, readyCount }) {
  if (state.phase === "READY_TO_REVEAL") return isLeader ? `<div class="waiting"><div><div class="waiting-icon">✦</div><h2 class="choice-title">Все готовы</h2><p class="choice-description">Проверьте физические карты и раскройте результаты.</p><button class="button button-primary button-full" data-action="reveal-results" ${state.busy ? "disabled" : ""}>Раскрыть результаты</button></div></div>` : waiting(readyCount, state.players.length, "Ведущий раскрывает результаты…");
  if (ready) return waiting(readyCount, state.players.length, "Ваш выбор сохранён.");
  const cardCount = getCardCount(state.players.length);
  const required = getRequiredOwnCardCount(state.players.length, state.userId, state.leaderId);
  const ownCards = submission?.ownCards ?? [];
  const vote = submission?.vote ?? null;
  const ownButtons = buttons(cardCount, ownCards, [], "choose-own-card");
  const voteButtons = buttons(cardCount, vote == null ? [] : [vote], ownCards, "choose-vote");
  const canSubmit = ownCards.length === required && (isLeader || Number.isInteger(vote));
  return `<h2 class="choice-title">${required === 2 ? "Какие две карты ваши?" : "Какая карта ваша?"}</h2><p class="choice-description">Выберите ${required === 2 ? "две карты, которые вы положили" : "номер своей карты"}.</p><div class="card-selector">${ownButtons}</div>
    ${isLeader ? `<div class="choice-divider"></div><p class="choice-description">Вы ведущий: выберите свою карту и подтвердите.</p>` : `<div class="choice-divider"></div><h2 class="choice-title">Где карта ведущего?</h2><p class="choice-description">За свои карты голосовать нельзя.</p><div class="card-selector">${voteButtons}</div>`}
    <button class="button button-primary button-full" data-action="submit-choice" ${!canSubmit || state.busy ? "disabled" : ""}>Готово</button>`;
}

function buttons(count, selected, disabled, action) { return Array.from({ length: count }, (_, index) => index + 1).map(card => `<button class="card-number ${selected.includes(card) ? "selected" : ""}" data-action="${action}" data-card="${card}" ${disabled.includes(card) ? "disabled" : ""} aria-pressed="${selected.includes(card)}">${card}</button>`).join(""); }
function waiting(ready, total, text) { return `<div class="waiting"><div><div class="waiting-icon">✓</div><h2 class="choice-title">${ready} из ${total} готовы</h2><p class="choice-description">${text}</p></div></div>`; }
function positions(state) { const isHost = state.players.find(player => player.id === state.userId)?.isHost; const rows = [...state.players].sort((a,b) => b.progress - a.progress).map((player, index) => `<div class="score-row"><span class="score-position">${index + 1}</span><span class="score-name">${escapeHtml(player.name)}</span><span class="score-progress">${player.progress} шаг.</span>${!player.connected && isHost && !player.isHost ? `<button class="button button-danger" data-action="remove-player" data-player-id="${escapeHtml(player.id)}">Исключить</button>` : !player.connected ? `<span class="badge">нет связи</span>` : ""}</div>`).join(""); return `<section class="panel panel-padding"><strong>Позиции</strong><div class="score-list" style="margin-top:12px">${rows}</div></section>`; }
