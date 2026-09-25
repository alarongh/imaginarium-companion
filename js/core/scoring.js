import { getCardCount, validateRound } from "./validation.js";

export class RoundValidationError extends Error {
  constructor(validation) {
    super("Раунд содержит некорректные данные.");
    this.name = "RoundValidationError";
    this.validation = validation;
  }
}

export function calculateRound({ playerIds, leaderId, submissions }) {
  const validation = validateRound({ playerIds, leaderId, submissions });
  if (!validation.valid) throw new RoundValidationError(validation);

  const cardCount = getCardCount(playerIds.length);
  const nonLeaderIds = playerIds.filter(id => id !== leaderId);
  const cardOwners = {};
  for (const playerId of playerIds) {
    for (const card of submissions[playerId].ownCards) cardOwners[card] = playerId;
  }

  const leaderCard = submissions[leaderId].ownCards[0];
  const votesPerCard = Object.fromEntries(Array.from({ length: cardCount }, (_, index) => [index + 1, 0]));
  for (const playerId of nonLeaderIds) votesPerCard[submissions[playerId].vote] += 1;

  const correctGuessers = nonLeaderIds.filter(id => submissions[id].vote === leaderCard);
  const guessedByAll = correctGuessers.length === nonLeaderIds.length;
  const guessedByNone = correctGuessers.length === 0;
  const bonusVotesByPlayer = {};
  const deltas = {};

  for (const playerId of playerIds) {
    bonusVotesByPlayer[playerId] = submissions[playerId].ownCards.reduce((sum, card) => sum + votesPerCard[card], 0);
    deltas[playerId] = 0;
  }

  let mode = "PARTIAL";
  if (guessedByAll) {
    mode = "ALL_GUESSED";
    for (const playerId of nonLeaderIds) deltas[playerId] = 3;
  } else if (guessedByNone) {
    mode = "NONE_GUESSED";
    for (const playerId of playerIds) deltas[playerId] = bonusVotesByPlayer[playerId];
  } else {
    for (const playerId of playerIds) {
      const base = playerId === leaderId || correctGuessers.includes(playerId) ? 3 : 0;
      deltas[playerId] = base + bonusVotesByPlayer[playerId];
    }
  }

  const votes = nonLeaderIds.map(playerId => {
    const card = submissions[playerId].vote;
    return { playerId, card, cardOwnerId: cardOwners[card], correct: card === leaderCard };
  });

  return { mode, leaderId, leaderCard, cardCount, cardOwners, votes, votesPerCard, correctGuessers, bonusVotesByPlayer, deltas };
}
