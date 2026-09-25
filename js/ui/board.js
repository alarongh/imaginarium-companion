import { escapeHtml } from "./escape.js";
export const BOARD_SIZE = 24;

export function renderBoard(state, { animateFrom = null } = {}) {
  const coords = coordinates();
  const cells = coords.map((coord, index) => {
    const pieces = state.players.filter(player => player.progress % BOARD_SIZE === index).map(player => {
      const from = animateFrom?.[player.id];
      return `<span class="board-piece" data-player-id="${escapeHtml(player.id)}" ${from !== undefined ? `data-from-progress="${Number(from)}" data-to-progress="${Number(player.progress)}"` : ""} title="${escapeHtml(player.name)}" style="--piece-color:${player.color}"></span>`;
    }).join("");
    return `<div class="board-cell" data-board-cell="${index}" style="grid-row:${coord.row};grid-column:${coord.column}"><span class="board-cell-number">${index + 1}</span><div class="board-pieces">${pieces}</div></div>`;
  }).join("");
  return `<div class="board">${cells}<div class="board-center"><div><div class="board-center-label">Кон</div><div class="board-round">${Number(state.roundNumber)}</div></div></div></div>`;
}

function coordinates() {
  const result = [];
  for (let column = 1; column <= 7; column += 1) result.push({ row: 1, column });
  for (let row = 2; row <= 7; row += 1) result.push({ row, column: 7 });
  for (let column = 6; column >= 1; column -= 1) result.push({ row: 7, column });
  for (let row = 6; row >= 2; row -= 1) result.push({ row, column: 1 });
  return result;
}
