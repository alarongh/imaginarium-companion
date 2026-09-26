import { calculateRound } from "../js/core/scoring.js";

const API_KEY = "AIzaSyC0mLOepFrKjI9C_Ztl-dI_G8pPhn-ur6M";
const DB_URL = "https://imaginarium-companion-default-rtdb.europe-west1.firebasedatabase.app";
const COLORS = ["red", "blue", "green", "yellow", "purple", "cyan", "orange"];
const roomCode = String(800000 + Math.floor(Math.random() * 100000));
const users = [];
let adminToken = null;

async function anonymousUser() {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true })
  });
  if (!response.ok) throw new Error(`Anonymous Auth failed: ${response.status}`);
  const data = await response.json();
  return { uid: data.localId, token: data.idToken };
}

async function database(method, path, token, body, accepted = [200]) {
  const response = await fetch(`${DB_URL}/${path}.json?auth=${encodeURIComponent(token)}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!accepted.includes(response.status)) {
    const detail = await response.text();
    throw new Error(`${method} ${path}: ${response.status} ${detail}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function cleanup() {
  if (!adminToken || !users.length) return;
  try {
    await database("DELETE", `roomSecrets/${roomCode}/submissions`, adminToken, undefined, [200, 401, 403, 404]);
    for (const user of users.slice(0, 7)) {
      await database("PATCH", `rooms/${roomCode}/players/${user.uid}`, adminToken, { connected: false, lastSeen: Date.now() }, [200, 401, 403, 404]);
      await database("DELETE", `rooms/${roomCode}/players/${user.uid}`, adminToken, undefined, [200, 401, 403, 404]);
    }
    for (const color of COLORS) await database("DELETE", `rooms/${roomCode}/colorClaims/${color}`, adminToken, undefined, [200, 401, 403, 404]);
    await database("DELETE", `rooms/${roomCode}/meta`, adminToken, undefined, [200, 401, 403, 404]);
  } catch (error) {
    console.error(`Cleanup warning: ${error.message}`);
  }
}

try {
  for (let index = 0; index < 8; index += 1) users.push(await anonymousUser());
  const host = users[0];
  adminToken = host.token;
  const now = Date.now();

  await database("PUT", `rooms/${roomCode}/meta`, host.token, {
    hostId: host.uid,
    status: "lobby",
    phase: "LOBBY",
    roundNumber: 0,
    playerCount: 0,
    leaderId: "",
    turnOrder: {},
    createdAt: now
  });

  for (let index = 0; index < 7; index += 1) {
    const user = users[index];
    await database("PUT", `rooms/${roomCode}/colorClaims/${COLORS[index]}`, user.token, user.uid);
    await database("PUT", `rooms/${roomCode}/players/${user.uid}`, user.token, {
      name: `QA ${index + 1}`,
      colorId: COLORS[index],
      progress: 0,
      joinedAt: now + index,
      connected: true,
      lastSeen: now + index
    });
  }

  await database("PUT", `rooms/${roomCode}/colorClaims/black`, users[7].token, users[7].uid, [401, 403]);
  const playerIds = users.slice(0, 7).map(user => user.uid);
  await database("PATCH", `rooms/${roomCode}/meta`, host.token, {
    status: "playing",
    phase: "ROUND_INPUT",
    roundNumber: 1,
    playerCount: 7,
    leaderId: host.uid,
    turnOrder: playerIds
  });

  const submissions = {};
  for (let index = 0; index < 7; index += 1) {
    const user = users[index];
    const submission = index === 0 ? { ownCards: [1] } : { ownCards: [index + 1], vote: 1 };
    submissions[user.uid] = { ...submission, vote: submission.vote ?? null };
    await database("PUT", `roomSecrets/${roomCode}/submissions/${user.uid}`, user.token, submission);
    await database("PUT", `rooms/${roomCode}/round/ready/${user.uid}`, user.token, true);
  }

  await database("PATCH", `rooms/${roomCode}/meta`, host.token, { phase: "READY_TO_REVEAL" });
  await database("GET", `roomSecrets/${roomCode}/submissions`, users[1].token, undefined, [401, 403]);
  await database("GET", `roomSecrets/${roomCode}/submissions/${users[1].uid}`, users[1].token);
  const revealed = await database("GET", `roomSecrets/${roomCode}/submissions`, host.token);
  if (Object.keys(revealed).length !== 7) throw new Error("Leader did not receive seven submissions.");

  const result = calculateRound({ playerIds, leaderId: host.uid, submissions });
  await database("PATCH", "", host.token, {
    [`rooms/${roomCode}/round/result`]: { ...result, baseProgress: Object.fromEntries(playerIds.map(uid => [uid, 0])) },
    [`rooms/${roomCode}/meta/phase`]: "RESULTS"
  });
  await database("DELETE", `roomSecrets/${roomCode}/submissions`, host.token);
  await database("PATCH", "", host.token, {
    [`rooms/${roomCode}/meta/leaderId`]: playerIds[1],
    [`rooms/${roomCode}/meta/roundNumber`]: 2,
    [`rooms/${roomCode}/meta/phase`]: "ROUND_INPUT",
    [`rooms/${roomCode}/round/ready`]: null,
    [`rooms/${roomCode}/round/result`]: null,
    [`rooms/${roomCode}/round/error`]: null
  });

  await database("PATCH", `rooms/${roomCode}/players/${host.uid}`, host.token, { connected: false, lastSeen: Date.now() });
  await database("PATCH", `rooms/${roomCode}/meta`, users[1].token, { hostId: users[1].uid }, [401, 403]);
  await database("PATCH", `rooms/${roomCode}/players/${host.uid}`, host.token, { connected: false, lastSeen: Date.now() - 20000 });
  await database("PATCH", `rooms/${roomCode}/meta`, users[1].token, { hostId: users[1].uid });
  adminToken = users[1].token;
  await database("PATCH", `rooms/${roomCode}/meta`, users[1].token, { hostId: host.uid });
  adminToken = host.token;
  await database("PATCH", `rooms/${roomCode}/players/${host.uid}`, host.token, { connected: true, lastSeen: Date.now() });

  console.log("Firebase integration passed: 7 players, private submissions, full round, next round, guarded host recovery.");
} finally {
  await cleanup();
}
