export function formatMatchDate(dateTime: string) {
  if (!dateTime.includes(".")) {
    return dateTime;
  }

  const [date, time] = dateTime.split(" ");

  const [day, month] = date.split(".").map(Number);

  const weekdays = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];

  const jsDate = new Date(2026, month - 1, day);

  return `${weekdays[jsDate.getDay()]}, ${date}.2026 · ${time} Uhr`;
}