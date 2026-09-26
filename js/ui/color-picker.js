import { PLAYER_COLORS } from "../core/colors.js";
import { escapeHtml } from "./escape.js";

export function renderColorPicker(state) {
  const claimed = state.room?.colorClaims ?? {};
  const options = PLAYER_COLORS.map(color => {
    const taken = Boolean(claimed[color.id] && claimed[color.id] !== state.userId);
    return `<button type="button" class="player-color-option ${taken ? "taken" : ""}" style="--option-color:${color.value}" data-action="choose-room-color" data-color="${color.id}" aria-label="${color.label}${taken ? ", занят" : ""}" ${taken || state.busy ? "disabled" : ""}><span>${taken ? "Занят" : color.label}</span></button>`;
  }).join("");
  return `<main class="page color-page">
    <div class="brand"><div class="brand-mark">✦</div><span>Imaginarium Companion</span></div>
    <section class="panel panel-padding color-card">
      <span class="badge badge-accent">Комната ${escapeHtml(state.roomCode)}</span>
      <h1 class="color-title">Выберите слоника</h1>
      <p class="home-description">Цвет закрепится только после выбора. Занятые цвета обновляются сразу, без повторного входа в комнату.</p>
      ${state.error ? `<div class="error-banner" role="alert">${escapeHtml(state.error)}</div>` : ""}
      <div class="room-color-options">${options}</div>
      <button class="button button-ghost button-full" data-action="cancel-room-entry" ${state.busy ? "disabled" : ""}>Назад</button>
    </section>
  </main>`;
}
