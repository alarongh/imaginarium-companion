function key(roomCode, roundNumber, userId) { return `imaginarium-draft:${roomCode}:${roundNumber}:${userId}`; }
export function saveDraft(roomCode, roundNumber, userId, draft) { localStorage.setItem(key(roomCode, roundNumber, userId), JSON.stringify({ ownCards: draft.ownCards ?? [], vote: draft.vote ?? null })); }
export function loadDraft(roomCode, roundNumber, userId) { try { return JSON.parse(localStorage.getItem(key(roomCode, roundNumber, userId))); } catch { return null; } }
export function clearDraft(roomCode, roundNumber, userId) { localStorage.removeItem(key(roomCode, roundNumber, userId)); }
