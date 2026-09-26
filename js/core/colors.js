export const PLAYER_COLORS = [
  { id: "red", value: "#ec6674", label: "Красный" },
  { id: "blue", value: "#668cff", label: "Синий" },
  { id: "green", value: "#62ce91", label: "Зелёный" },
  { id: "yellow", value: "#f2b75f", label: "Жёлтый" },
  { id: "purple", value: "#bb73ed", label: "Фиолетовый" },
  { id: "cyan", value: "#55cbd3", label: "Бирюзовый" },
  { id: "orange", value: "#f28a4b", label: "Оранжевый" }
];

export function isValidColorId(colorId) {
  return PLAYER_COLORS.some(color => color.id === colorId);
}

export function getColorValue(colorId) {
  return PLAYER_COLORS.find(color => color.id === colorId)?.value ?? "#ffffff";
}
