export const DAILY_OPEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 3;

export function todayDailyOpenKey(churchId: string, todayKey: string) {
  return `semeron:today-flow-opened:${churchId}:${todayKey}`;
}

export function dailyOpenCookieName(storageKey: string) {
  let hash = 0;
  for (let index = 0; index < storageKey.length; index += 1) {
    hash = (hash * 31 + storageKey.charCodeAt(index)) % 2147483647;
  }
  return `semeron_today_flow_${hash.toString(36)}`;
}

export function hasDailyOpenCookie(cookieName: string) {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim() === `${cookieName}=true`);
}

export function readDailyOpenFlag(storageKey: string, cookieName: string) {
  try {
    if (window.localStorage.getItem(storageKey) === "true") return true;
  } catch {
    // Some PWA/private-browser contexts reject storage access; the cookie fallback keeps the daily gate stable.
  }

  return hasDailyOpenCookie(cookieName);
}

export function writeDailyOpenFlag(storageKey: string, cookieName: string) {
  try {
    window.localStorage.setItem(storageKey, "true");
  } catch {
    // Keep going so cookie fallback can still persist the daily decision.
  }

  try {
    document.cookie = `${cookieName}=true; Max-Age=${DAILY_OPEN_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
  } catch {
    // If both storage mechanisms are unavailable, the in-memory ref still prevents duplicate replay in this mount.
  }
}
