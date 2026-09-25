import { BOARD_SIZE } from "./board.js";

export function animateBoardMovements(root) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const board = root.querySelector(".board");
  if (!board) return;
  const centers = new Map();
  board.querySelectorAll("[data-board-cell]").forEach(cell => {
    const rect = cell.getBoundingClientRect();
    centers.set(Number(cell.dataset.boardCell), { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });
  board.querySelectorAll(".board-piece[data-from-progress]").forEach(piece => {
    const from = Number(piece.dataset.fromProgress);
    const to = Number(piece.dataset.toProgress);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return;
    const target = centers.get(to % BOARD_SIZE);
    if (!target) return;
    const frames = [];
    for (let progress = from; progress <= to; progress += 1) {
      const point = centers.get(progress % BOARD_SIZE);
      if (point) frames.push({ transform: `translate(${point.x - target.x}px, ${point.y - target.y}px) scale(1.15)` });
    }
    frames.push({ transform: "translate(0,0) scale(1)" });
    piece.style.zIndex = "20";
    piece.animate(frames, { duration: Math.min(1800, 350 + (to - from) * 190), easing: "ease-in-out", fill: "both" });
  });
}
