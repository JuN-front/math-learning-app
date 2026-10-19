// lib/logger.ts
// クライアントサイド専用の行動ログ送信ヘルパー

interface LogEvent {
  event: string;
  contentId?: string;
  itemId?: string;
  payload?: Record<string, unknown>;
  client_time: string;
}

const FLUSH_INTERVAL_MS = 5000;
let buffer: LogEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let visibilityListenerAdded = false;

function flush() {
  if (buffer.length === 0) return;
  const events = buffer.splice(0);
  const body = JSON.stringify({ events });
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/logs', new Blob([body], { type: 'application/json' }));
  } else {
    fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
}

function setupListeners() {
  if (visibilityListenerAdded || typeof document === 'undefined') return;
  visibilityListenerAdded = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      logEvent('tab_hidden');
      flush();
    } else {
      logEvent('tab_visible');
    }
  });

  window.addEventListener('pagehide', () => {
    flush();
  });
}

export function startLogger() {
  if (typeof window === 'undefined') return;
  setupListeners();
  if (!flushTimer) {
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  }
}

export function stopLogger() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();
}

export function logEvent(
  event: string,
  options?: { contentId?: string; itemId?: string; payload?: Record<string, unknown> }
) {
  if (typeof window === 'undefined') return;
  buffer.push({
    event,
    contentId: options?.contentId,
    itemId: options?.itemId,
    payload: options?.payload,
    client_time: new Date().toISOString(),
  });
}