export function getCardCount(playerCount) {
  return playerCount === 3 ? 5 : playerCount;
}

export function getRequiredOwnCardCount(playerCount, playerId, leaderId) {
  if (playerId === leaderId) return 1;
  return playerCount === 3 ? 2 : 1;
}

export function validateRound({ playerIds, leaderId, submissions }) {
  const errors = [];
  if (!Array.isArray(playerIds)) return invalid("INVALID_PLAYERS", "playerIds должен быть массивом.");
  if (playerIds.length < 3 || playerIds.length > 6) errors.push(issue("INVALID_PLAYER_COUNT", "Поддерживается от 3 до 6 игроков."));
  if (new Set(playerIds).size !== playerIds.length) errors.push(issue("DUPLICATE_PLAYER", "ID игроков должны быть уникальными."));
  if (!playerIds.includes(leaderId)) errors.push(issue("INVALID_LEADER", "Ведущий отсутствует среди игроков."));
  if (!submissions || typeof submissions !== "object" || Array.isArray(submissions)) {
    errors.push(issue("INVALID_SUBMISSIONS", "Нет данных раунда."));
    return { valid: false, errors };
  }

  const cardCount = getCardCount(playerIds.length);
  const cardOwners = new Map();

  for (const playerId of playerIds) {
    const submission = submissions[playerId];
    if (!submission || typeof submission !== "object") {
      errors.push(issue("MISSING_SUBMISSION", `Игрок ${playerId} не завершил выбор.`, { playerId }));
      continue;
    }

    const ownCards = submission.ownCards;
    if (!Array.isArray(ownCards)) {
      errors.push(issue("INVALID_OWN_CARDS", "ownCards должен быть массивом.", { playerId }));
      continue;
    }

    const required = getRequiredOwnCardCount(playerIds.length, playerId, leaderId);
    if (ownCards.length !== required) errors.push(issue("WRONG_OWN_CARD_COUNT", `Игрок должен указать ${required} карт.`, { playerId, expected: required, actual: ownCards.length }));
    if (new Set(ownCards).size !== ownCards.length) errors.push(issue("DUPLICATE_OWN_CARD", "Одна и та же карта указана несколько раз.", { playerId }));

    for (const card of ownCards) {
      if (!Number.isInteger(card) || card < 1 || card > cardCount) {
        errors.push(issue("INVALID_CARD_NUMBER", `Номер карты должен быть от 1 до ${cardCount}.`, { playerId, card }));
        continue;
      }
      if (cardOwners.has(card)) errors.push(issue("DUPLICATE_CARD_OWNER", `Карта №${card} указана несколькими игроками.`, { playerId, card, otherPlayerId: cardOwners.get(card) }));
      else cardOwners.set(card, playerId);
    }

    if (playerId === leaderId) {
      if (submission.vote !== null && submission.vote !== undefined) errors.push(issue("LEADER_CANNOT_VOTE", "Ведущий не участвует в голосовании.", { playerId }));
      continue;
    }

    const vote = submission.vote;
    if (!Number.isInteger(vote) || vote < 1 || vote > cardCount) errors.push(issue("INVALID_VOTE", `Голос должен быть номером от 1 до ${cardCount}.`, { playerId, vote }));
    else if (ownCards.includes(vote)) errors.push(issue("VOTE_FOR_OWN_CARD", "Игрок не может голосовать за свою карту.", { playerId, vote }));
  }

  for (let card = 1; card <= cardCount; card += 1) {
    if (!cardOwners.has(card)) errors.push(issue("CARD_WITHOUT_OWNER", `Для карты №${card} не указан владелец.`, { card }));
  }
  for (const playerId of Object.keys(submissions)) {
    if (!playerIds.includes(playerId)) errors.push(issue("UNKNOWN_PLAYER_SUBMISSION", `Получены данные неизвестного игрока ${playerId}.`, { playerId }));
  }
  return { valid: errors.length === 0, errors };
}

function issue(code, message, extra = {}) { return { code, message, ...extra }; }
function invalid(code, message) { return { valid: false, errors: [issue(code, message)] }; }
