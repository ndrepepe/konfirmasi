const wibDateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatDateTimeWib(value: string | Date) {
  return wibDateTimeFormatter.format(new Date(value));
}

export function formatDateOnly(value: unknown) {
  const rawValue = String(value ?? "");
  const dateParts = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateParts) {
    return `${dateParts[3]}/${dateParts[2]}/${dateParts[1]}`;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function toDateInputValue(value: unknown) {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }

  const rawValue = String(value);
  const dateParts = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateParts) return dateParts[1];

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function getTodayWib() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizeDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return getTodayWib();

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? getTodayWib()
    : value;
}
