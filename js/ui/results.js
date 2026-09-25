import { getEndVoteCounts } from "../core/game-state.js";
import { renderBoard } from "./board.js";
import { escapeHtml } from "./escape.js";

export function renderResults(state) {
  const result = state.round.result;
  if (!result) return `<main class="app"><div class="error-banner">Результат кона загружается…</div></main>`;
  const preview = state.players.map(player => ({ ...player, progress: Number(result.baseProgress?.[player.id] ?? player.progress) + Number(result.deltas?.[player.id] ?? 0) }));
  const from = Object.fromEntries(state.players.map(player => [player.id, Number(result.baseProgress?.[player.id] ?? player.progress)]));
  const rows = [...preview].sort((a,b) => b.progress - a.progress).map((player, index) => `<div class="score-row"><span class="score-position">${index + 1}</span><span class="score-name">${escapeHtml(player.name)}</span><span class="score-progress">${player.progress} шаг.</span><span class="score-delta">+${Number(result.deltas?.[player.id] ?? 0)}</span></div>`).join("");
  const guesses = result.votes?.filter(vote => vote.correct).length ?? 0;
  const isHost = state.players.find(player => player.id === state.userId)?.isHost;
  return `<div class="app page"><header class="game-header"><div><span class="badge badge-accent">Итоги кона ${state.roundNumber}</span><h1 class="game-title">Результаты раскрыты</h1></div></header>${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ""}
    <div class="game-layout"><section class="panel board-panel">${renderBoard({ ...state, players: preview }, { animateFrom: from })}</section><aside class="game-sidebar"><section class="panel panel-padding"><div class="result-summary"><div class="result-stat"><div class="result-stat-value">${result.leaderCard}</div><div class="result-stat-label">карта ведущего</div></div><div class="result-stat"><div class="result-stat-value">${guesses}</div><div class="result-stat-label">угадали</div></div><div class="result-stat"><div class="result-stat-value">${modeLabel(result.mode)}</div><div class="result-stat-label">сценарий</div></div></div><div class="score-list">${rows}</div></section>
    ${endVote(state)}<div class="results-actions">${isHost ? `<button class="button button-primary button-full" data-action="next-round" ${state.endVote?.active || state.busy ? "disabled" : ""}>Следующий кон</button>` : `<div class="panel panel-padding muted">Следующий кон запускает хост комнаты.</div>`}</div></aside></div></div>`;
}

function endVote(state) {
  const vote = state.endVote;
  if (!vote || vote.outcome === "rejected") return `<section class="panel panel-padding"><strong>Завершение партии</strong><p class="choice-description">Можно предложить голосование между конами.</p><button class="button button-ghost button-full" data-action="start-end-vote">Предложить завершить игру</button></section>`;
  const ids = state.players.map(player => player.id);
  const counts = getEndVoteCounts(ids, vote.votes ?? {});
  const mine = vote.votes?.[state.userId];
  return `<section class="panel panel-padding"><strong>Голосование за завершение</strong><p class="choice-description">За: ${counts.yes} · проголосовали: ${counts.cast}/${ids.length} · нужно: ${counts.required}</p><div class="vote-buttons"><button class="button ${mine === true ? "button-primary" : ""}" data-action="end-vote-yes">Завершить</button><button class="button ${mine === false ? "button-primary" : ""}" data-action="end-vote-no">Продолжить</button></div></section>`;
}
function modeLabel(mode) { return mode === "ALL_GUESSED" ? "все" : mode === "NONE_GUESSED" ? "никто" : "частично"; }
