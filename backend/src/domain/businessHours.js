// Fortaleza: UTC-03, seg–sex 08–12 e 14–18, sáb 08–12.
const OFFSET = 3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
function windowAt(value) {
  const local = new Date(Number(value) - OFFSET);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + OFFSET;
  const weekday = local.getUTCDay();
  const windows = weekday === 0 ? [] : weekday === 6 ? [[8, 12]] : [[8, 12], [14, 18]];
  return { day, windows: windows.map(([start, end]) => [day + start * 3600000, day + end * 3600000]) };
}
function isBusinessTime(value = new Date()) {
  const time = new Date(value).getTime();
  const w = windowAt(time);
  return w.windows.some(([open, close]) => time >= open && time < close);
}
function businessMinutesBetween(start, end) {
  const a = new Date(start).getTime(), b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (b < a) return -businessMinutesBetween(end, start);
  let total = 0;
  for (let cursor = a; cursor < b;) {
    const w = windowAt(cursor);
    for (const [open, close] of w.windows) total += Math.max(0, Math.min(b, close) - Math.max(cursor, open));
    cursor = w.day + DAY;
  }
  return total / 60000;
}
module.exports = { isBusinessTime, businessMinutesBetween };
