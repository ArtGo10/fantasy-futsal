export function formatMatchDate(timestamp: number) {
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function formatMatchTime(timestamp: number) {
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function isSameLocalDay(timestamp: number, referenceTimestamp: number) {
  return getLocalDayStart(timestamp) === getLocalDayStart(referenceTimestamp);
}

export function getLocalDayStart(timestamp: number) {
  const date = new Date(timestamp);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function addLocalDays(timestamp: number, days: number) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);

  return getLocalDayStart(date.getTime());
}
