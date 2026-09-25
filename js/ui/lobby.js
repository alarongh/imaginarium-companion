import { escapeHtml } from "./escape.js";

export function renderLobby(state) {
  const me = state.players.find(player => player.id === state.userId);
  const isHost = me?.isHost;
  const players = state.players.map(player => `<div class="player-row">
    <div class="player-color" style="--player-color:${player.color}"></div>
    <div class="player-info"><div class="player-name">${escapeHtml(player.name)}</div><div class="player-meta">${player.id === state.userId ? "Это вы" : "Игрок"} · ${player.connected ? "в сети" : "нет связи"}</div></div>
    <div class="player-tags">${player.isHost ? `<span class="badge">Хост</span>` : ""}</div>
  </div>`).join("");
  return `<div class="app page"><header class="topbar"><div class="brand"><div class="brand-mark">✦</div>Imaginarium Companion</div><button class="button button-ghost" data-action="leave-room">Выйти</button></header>
    ${state.error ? `<div class="error-banner" role="alert">${escapeHtml(state.error)}</div>` : ""}
    <div class="room-header"><div><span class="badge badge-accent">Лобби</span><h1 class="room-title">Комната</h1><div class="muted">Код для подключения</div></div><div><div class="room-code">${escapeHtml(state.roomCode)}</div><button class="button button-ghost" data-action="copy-room-code">${state.copyFeedback ? "Скопировано" : "Скопировать код"}</button></div></div>
    <div class="lobby-layout"><section class="panel panel-padding"><strong>Игроки · ${state.players.length}/6</strong><div class="players-list">${players}</div></section>
    <aside class="lobby-side"><section class="panel panel-padding"><p class="lobby-note">Когда подключатся 3–6 игроков, хост запускает партию. Все должны быть в сети.</p></section>${isHost ? `<button class="button button-primary button-full" data-action="start-game" ${state.players.length < 3 || state.players.some(player => !player.connected) || state.busy ? "disabled" : ""}>Начать игру</button>` : `<div class="panel panel-padding muted">Ждём, когда хост начнёт игру.</div>`}</aside></div>
  </div>`;
}
