// API route /api/koan-single 호출 클라이언트.
// in-flight 1개만 유지(새 트리거가 이전 호출을 abort), 401/403 영구 disable circuit breaker,
// 타임아웃 3초, 5xx/timeout 후 30초 쿨다운.

import type { KoanContextPayload } from "./koan-prompt";
import type { Koan } from "./koan-validate";

const TIMEOUT_MS = 3000;
const FAILURE_COOLDOWN_MS = 30000;

let inflight: AbortController | null = null;
let circuitOpen = false;
let lastFailureAt = 0;
let warned = false;

function nowMs(): number {
  return Date.now();
}

export function isKoanDisabled(): boolean {
  return circuitOpen;
}

export async function requestKoan(
  ctx: KoanContextPayload
): Promise<Koan | null> {
  if (typeof window === "undefined") return null;
  if (circuitOpen) {
    console.log(
      `[koan] [Gemini 비활성] 인증 실패로 circuit open 상태 — 시드 fallback (rule=${ctx.trigger.rule})`
    );
    return null;
  }
  const cooldownLeft = FAILURE_COOLDOWN_MS - (nowMs() - lastFailureAt);
  if (cooldownLeft > 0) {
    console.log(
      `[koan] [Gemini 쿨다운] 직전 실패로 ${Math.ceil(cooldownLeft / 1000)}s 대기 중 — 시드 fallback (rule=${ctx.trigger.rule})`
    );
    return null;
  }

  // 이전 in-flight abort
  if (inflight) {
    console.log(
      `[koan] [Gemini abort] 이전 호출이 아직 진행 중이었음 — 새 트리거(${ctx.trigger.rule})가 우선`
    );
    inflight.abort();
    inflight = null;
  }

  const controller = new AbortController();
  inflight = controller;
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  const startedAt = nowMs();
  console.log(
    `[koan] [Gemini 호출 시작] rule=${ctx.trigger.rule}  reason="${ctx.trigger.reason}"  recent=${ctx.recentContent.length}자  excerpt=${ctx.activeFile?.excerpt.length ?? 0}자`
  );

  try {
    const res = await fetch("/api/koan-single", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ context: ctx }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    const elapsed = nowMs() - startedAt;

    if (res.status === 401 || res.status === 403) {
      circuitOpen = true;
      if (!warned) {
        console.error(
          `[koan] [Gemini 차단] 인증 실패 (${res.status}) — 이번 세션 재시도 안 함. 모든 트리거 시드로 fallback`
        );
        warned = true;
      }
      return null;
    }
    if (res.status === 429) {
      lastFailureAt = nowMs();
      console.warn(
        `[koan] [Gemini 실패] rate limit (429) — ${FAILURE_COOLDOWN_MS / 1000}s 쿨다운, 시드 fallback`
      );
      return null;
    }
    if (res.status === 503) {
      // 서버가 키 부재 또는 검증 실패로 503. 검증 실패는 잦으므로 쿨다운 짧게.
      lastFailureAt = nowMs() - (FAILURE_COOLDOWN_MS - 5000); // 5초 쿨다운만
      console.warn(
        `[koan] [Gemini 실패] 503 (키 부재 또는 검증 게이트 reject) — 5s 쿨다운, 시드 fallback (${elapsed}ms 소요)`
      );
      return null;
    }
    if (!res.ok) {
      lastFailureAt = nowMs();
      console.warn(
        `[koan] [Gemini 실패] HTTP ${res.status} — 시드 fallback (${elapsed}ms 소요)`
      );
      return null;
    }
    const json = (await res.json()) as Koan;
    if (
      typeof json?.ko !== "string" ||
      typeof json?.en !== "string" ||
      json.ko.length === 0 ||
      json.en.length === 0
    ) {
      lastFailureAt = nowMs();
      console.warn(
        `[koan] [Gemini 실패] 응답 형식 이상 — 시드 fallback (${elapsed}ms 소요)`
      );
      return null;
    }
    console.log(
      `[koan] [Gemini 응답 OK] ${elapsed}ms  ko="${json.ko}"  en="${json.en}"`
    );
    return json;
  } catch (err) {
    window.clearTimeout(timeout);
    const elapsed = nowMs() - startedAt;
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort) {
      console.log(
        `[koan] [Gemini abort 완료] 호출이 ${elapsed}ms에 취소됨 — 새 트리거가 처리`
      );
    } else {
      lastFailureAt = nowMs();
      console.warn(
        `[koan] [Gemini 실패] 네트워크/예외 (${elapsed}ms) — 시드 fallback`,
        err
      );
    }
    return null;
  } finally {
    if (inflight === controller) inflight = null;
  }
}

export function disposeKoanClient(): void {
  if (inflight) {
    inflight.abort();
    inflight = null;
  }
  // circuit/cooldown은 reset (HMR / 언마운트 후 재마운트 시 재시도)
  circuitOpen = false;
  lastFailureAt = 0;
  warned = false;
}
