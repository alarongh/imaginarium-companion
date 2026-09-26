import { escapeHtml } from "./escape.js";
export const BOARD_SIZE = 39;

export function renderBoard(state, { animateFrom = null } = {}) {
  const coords = coordinates();
  const cells = coords.map((coord, index) => {
    const pieces = state.players.filter(player => player.progress % BOARD_SIZE === index).map(player => {
      const from = animateFrom?.[player.id];
      return `<span class="board-piece" data-player-id="${escapeHtml(player.id)}" ${from !== undefined ? `data-from-progress="${Number(from)}" data-to-progress="${Number(player.progress)}"` : ""} title="${escapeHtml(player.name)}" style="--piece-color:${player.color}"></span>`;
    }).join("");
    return `<div class="board-cell" data-board-cell="${index}" style="--board-x:${coord.x}%;--board-y:${coord.y}%;--cloud-scale:${coord.scale}"><span class="board-cell-number">${index + 1}</span><div class="board-pieces">${pieces}</div></div>`;
  }).join("");
  return `<div class="board">${cells}<div class="board-center"><div><div class="board-center-label">Кон</div><div class="board-round">${Number(state.roundNumber)}</div></div></div></div>`;
}

function coordinates() {
  const left = [
    [11, 91, 1.18], [11, 83, .94], [10, 75, .94], [11, 67, .96], [12, 59, .96], [12, 51, .96], [13, 43, .94], [12, 35, .94], [14, 27, .94], [28, 20, .95]
  ];
  const middleDown = [
    [40, 27, .96], [39, 35, .98], [40, 43, .96], [39, 51, .96], [39, 59, .96], [39, 67, .96], [39, 75, .96], [40, 83, .96], [52, 91, .98]
  ];
  const middleUp = [
    [64, 83, .96], [63, 75, .96], [64, 67, .96], [63, 59, .96], [64, 51, .96], [63, 43, .96], [64, 35, .96], [63, 27, .96], [66, 20, .96]
  ];
  const rightDown = [
    [83, 20, .95], [84, 27, .96], [84, 35, .96], [84, 43, .96], [84, 51, .96], [84, 59, .96], [84, 67, .96], [84, 75, .96], [84, 83, .96], [83, 91, .98], [67, 96, .92]
  ];
  return [...left, ...middleDown, ...middleUp, ...rightDown].map(([x, y, scale]) => ({ x, y, scale }));
}
