const pad = (value: number) => String(value).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function localDate(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time of day as HH:MM. */
export function localTime(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
