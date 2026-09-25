const SESSION_KEY = "imaginarium-room-session";
const PROFILE_KEY = "imaginarium-player-profile";

export function saveRoomSession(roomCode) { localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode })); }
export function clearRoomSession() { localStorage.removeItem(SESSION_KEY); }
export function loadRoomSession() { return readJson(SESSION_KEY, null); }
export function saveProfile(profile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
export function loadProfile() { return readJson(PROFILE_KEY, { name: "", colorId: "red" }); }

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
