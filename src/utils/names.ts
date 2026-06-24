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
