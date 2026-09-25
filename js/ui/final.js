import { escapeHtml } from "./escape.js";
export function renderFinal(state) {
  const rows = [...state.players].sort((a,b) => b.progress - a.progress).map((player, index) => `<div class="score-row"><span class="score-position">${index + 1}</span><span class="score-name">${escapeHtml(player.name)}</span><span class="score-progress">${player.progress} шаг.</span><span></span></div>`).join("");
  const winner = [...state.players].sort((a,b) => b.progress - a.progress)[0];
  return `<main class="app final-layout"><div><span class="badge badge-accent">Партия завершена</span><h1 class="final-title">${winner ? `${escapeHtml(winner.name)} впереди` : "Финальные результаты"}</h1><p class="muted">Итог после ${state.roundNumber} конов.</p></div><section class="panel panel-padding"><div class="score-list">${rows}</div></section><button class="button button-primary" data-action="leave-room">На главную</button></main>`;
}
