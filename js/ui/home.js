import { escapeHtml } from "./escape.js";

export function renderHome(state) {
  return `<main class="page home">
    <div class="brand"><div class="brand-mark">✦</div><span>Imaginarium Companion</span></div>
    <h1 class="home-title">Физические карты.<br>Умный подсчёт.</h1>
    <p class="home-description">Комната для скрытого голосования, подсчёта очков и движения фишек во время обычной партии.</p>
    ${state.error ? `<div class="error-banner" role="alert">${escapeHtml(state.error)}</div>` : ""}
    <section class="panel panel-padding home-actions">
      <div class="profile-grid">
        <label><span class="label">Ваше имя</span><input class="input" name="playerName" data-control="player-name" maxlength="24" autocomplete="nickname" value="${escapeHtml(state.profile.name)}" placeholder="Например, Никита"></label>
      </div>
      <button class="button button-primary button-full" data-action="create-room" ${state.busy ? "disabled" : ""}>Создать комнату</button>
      <div class="home-divider">или войти по коду</div>
      <form class="join-form" data-form="join-room"><label class="sr-only" for="room-code">Код комнаты</label><input id="room-code" class="input" name="roomCode" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="Шестизначный код"><button class="button" ${state.busy ? "disabled" : ""}>Войти</button></form>
    </section>
  </main>`;
}
