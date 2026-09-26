import test from "node:test";
import assert from "node:assert/strict";
import { calculateRound, RoundValidationError } from "../js/core/scoring.js";
import { getBoardPosition, getEndVoteCounts, getNextLeaderId } from "../js/core/game-state.js";
import { escapeHtml } from "../js/ui/escape.js";
import { readFileSync } from "node:fs";

test("контрольный пример для пяти игроков", () => {
  const result = calculateRound({
    playerIds: ["nikita", "maxim", "sasha", "dasha", "ilya"], leaderId: "nikita",
    submissions: {
      nikita: { ownCards: [3], vote: null }, maxim: { ownCards: [2], vote: 3 },
      sasha: { ownCards: [1], vote: 4 }, dasha: { ownCards: [5], vote: 1 }, ilya: { ownCards: [4], vote: 3 }
    }
  });
  assert.equal(result.mode, "PARTIAL");
  assert.deepEqual(result.deltas, { nikita: 5, maxim: 3, sasha: 1, dasha: 0, ilya: 4 });
});

test("все угадали", () => {
  const result = calculateRound({ playerIds: ["a", "b", "c", "d"], leaderId: "a", submissions: {
    a: { ownCards: [1] }, b: { ownCards: [2], vote: 1 }, c: { ownCards: [3], vote: 1 }, d: { ownCards: [4], vote: 1 }
  }});
  assert.deepEqual(result.deltas, { a: 0, b: 3, c: 3, d: 3 });
});

test("никто не угадал", () => {
  const result = calculateRound({ playerIds: ["a", "b", "c", "d"], leaderId: "a", submissions: {
    a: { ownCards: [1] }, b: { ownCards: [2], vote: 3 }, c: { ownCards: [3], vote: 4 }, d: { ownCards: [4], vote: 2 }
  }});
  assert.deepEqual(result.deltas, { a: 0, b: 1, c: 1, d: 1 });
});

test("режим на троих: пять карт и две карты у неведущих", () => {
  const result = calculateRound({ playerIds: ["a", "b", "c"], leaderId: "a", submissions: {
    a: { ownCards: [3] }, b: { ownCards: [1, 4], vote: 3 }, c: { ownCards: [2, 5], vote: 4 }
  }});
  assert.equal(result.cardCount, 5);
  assert.deepEqual(result.deltas, { a: 4, b: 4, c: 0 });
});

test("нельзя голосовать за свою карту", () => {
  assert.throws(() => calculateRound({ playerIds: ["a", "b", "c"], leaderId: "a", submissions: {
    a: { ownCards: [1] }, b: { ownCards: [2, 3], vote: 2 }, c: { ownCards: [4, 5], vote: 1 }
  }}), RoundValidationError);
});

test("бесконечное поле", () => {
  assert.deepEqual(getBoardPosition(0), { circle: 1, cell: 1 });
  assert.deepEqual(getBoardPosition(39), { circle: 2, cell: 1 });
  assert.deepEqual(getBoardPosition(205), { circle: 6, cell: 11 });
});

test("смена ведущего по кругу", () => {
  assert.equal(getNextLeaderId(["a", "b", "c"], "c"), "a");
});

test("для завершения нужно строгое большинство", () => {
  for (const [count, required] of [[1,1],[2,2],[3,2],[4,3],[5,3],[6,4],[7,4]]) {
    const ids = Array.from({ length: count }, (_, index) => `p${index}`);
    assert.equal(getEndVoteCounts(ids, {}).required, required);
  }
});

test("валидные раскладки поддерживаются для 1, 2 и 4–7 игроков", () => {
  for (const count of [1, 2, 4, 5, 6, 7]) {
    const ids = Array.from({ length: count }, (_, index) => `p${index + 1}`);
    const submissions = Object.fromEntries(ids.map((id, index) => [id, index === 0 ? { ownCards: [1] } : { ownCards: [index + 1], vote: 1 }]));
    const result = calculateRound({ playerIds: ids, leaderId: ids[0], submissions });
    assert.equal(result.cardCount, count);
    assert.equal(Object.keys(result.deltas).length, count);
  }
});

test("имя игрока экранируется перед вставкой в HTML", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">'`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#039;");
});

test("production rules сохраняют приватность и разделение ролей", () => {
  const rules = readFileSync(new URL("../database.rules.json", import.meta.url), "utf8");
  assert.match(rules, /meta\/leaderId/);
  assert.match(rules, /READY_TO_REVEAL/);
  assert.match(rules, /auth\.uid === \$uid/);
  assert.match(rules, /colorClaims/);
  assert.match(rules, /meta\/hostId/);
  assert.match(rules, /playerCount/);
  assert.match(rules, /playerCount'\)\.val\(\) <= 7/);
  assert.match(rules, /lastSeen'\)\.val\(\) <= now - 15000/);
  assert.match(rules, /orange/);
  assert.doesNotMatch(rules, /numChildren/);
});

test("цвет выбирается после входа в комнату", () => {
  const home = readFileSync(new URL("../js/ui/home.js", import.meta.url), "utf8");
  const picker = readFileSync(new URL("../js/ui/color-picker.js", import.meta.url), "utf8");
  assert.doesNotMatch(home, /select-color|Цвет фишки/);
  assert.match(picker, /choose-room-color/);
  assert.match(picker, /Занят/);
});
