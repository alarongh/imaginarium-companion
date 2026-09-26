export function applyScoreDeltas(players, deltas) {
  return players.map(player => ({ ...player, progress: player.progress + (deltas[player.id] ?? 0) }));
}

export function getNextLeaderId(turnOrder, currentLeaderId) {
  if (!Array.isArray(turnOrder) || turnOrder.length === 0) throw new Error("turnOrder не должен быть пустым.");
  const currentIndex = turnOrder.indexOf(currentLeaderId);
  if (currentIndex < 0) throw new Error("Текущий ведущий отсутствует в turnOrder.");
  return turnOrder[(currentIndex + 1) % turnOrder.length];
}

export function getBoardPosition(progress, boardSize = 39) {
  if (!Number.isInteger(progress) || progress < 0) throw new Error("progress должен быть неотрицательным целым числом.");
  if (!Number.isInteger(boardSize) || boardSize < 1) throw new Error("Некорректный размер поля.");
  return { circle: Math.floor(progress / boardSize) + 1, cell: (progress % boardSize) + 1 };
}

export function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? [...value] : Object.values(value);
}

export function normalizeSubmissions(raw = {}) {
  return Object.fromEntries(Object.entries(raw).map(([uid, value]) => [uid, { ownCards: normalizeArray(value?.ownCards).map(Number), vote: value?.vote == null ? null : Number(value.vote) }]));
}

export function getEndVoteCounts(playerIds, votes = {}) {
  const cast = playerIds.filter(id => typeof votes[id] === "boolean").length;
  const yes = playerIds.filter(id => votes[id] === true).length;
  return { cast, yes, required: Math.floor(playerIds.length / 2) + 1 };
}
