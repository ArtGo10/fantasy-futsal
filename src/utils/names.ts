function capitalizeNamePart(value: string) {
  if (!value) return value;

  const [firstLetter, ...restLetters] = Array.from(value);
  return `${firstLetter.toLocaleUpperCase("ru-RU")}${restLetters.join("").toLocaleLowerCase("ru-RU")}`;
}

export function formatPersonName(name: string | null | undefined) {
  return (name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.split(/([-’'])/).map(capitalizeNamePart).join(""))
    .join(" ");
}

export function formatParticipantName(name: string | null | undefined) {
  const [firstName, lastName] = formatPersonName(name).split(" ").filter(Boolean);
  const [lastInitial] = Array.from(lastName ?? "");

  return firstName && lastInitial ? `${firstName} ${lastInitial}.` : firstName ?? "";
}

export function formatTeamName(name: string | null | undefined) {
  const normalized = (name ?? "").trim().replace(/\s+/g, " ");

  if (normalized === "Босния и Герцеговина") {
    return "Босния";
  }

  return normalized;
}
