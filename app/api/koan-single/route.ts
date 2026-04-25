// LLM 자막 1라인 생성 API.
// 클라이언트 → POST { context } → Gemini → 검증 → 응답.
//
// Key fallback 정책:
//   1) GEMINI_API_KEY (primary) 시도
//   2) primary가 auth/ratelimit/transient 에러면 GEMINI_API_KEY_BACKUP 으로 재시도
//   3) primary가 validation/parse 실패면 backup 시도 안 함 (같은 모델·프롬프트라
//      backup도 같은 형식 reject 가능성 ↑, 비용 두 배)
//   4) backup이 OK면 200 — 클라는 primary가 죽은 줄 모름
//   5) 둘 다 실패하면 마지막 에러 status 그대로 클라에 전달
//      (둘 다 401이면 클라 circuit open, 둘 다 429면 쿨다운)
//
// 응답 코드 정책:
//   200 + JSON  : { ko, en }
//   400         : 컨텍스트 누락/형식 오류
//   401         : 둘 다 인증 실패 — 클라가 circuit open
//   429         : 둘 다 rate limit — 클라가 쿨다운
//   500         : 둘 다 일반 실패 (네트워크/서버 측) — 클라가 쿨다운
//   503         : primary 키 부재 또는 검증 게이트 reject — 클라가 짧은 쿨다운

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, KOAN_RESPONSE_SCHEMA, KOAN_MODEL } from "@/lib/koan-prompt";
import { validateKoan } from "@/lib/koan-validate";
import type { Koan } from "@/lib/koan-validate";

export const runtime = "nodejs";

type GeminiError = { status?: number; message?: string };

function isGeminiError(e: unknown): e is GeminiError {
  return typeof e === "object" && e !== null && ("status" in e || "message" in e);
}

type CallOutcome =
  | { kind: "ok"; value: Koan }
  | { kind: "validation"; reason: string }
  | { kind: "parse" }
  | { kind: "auth" }
  | { kind: "ratelimit" }
  | { kind: "transient"; status?: number; message?: string };

async function callGemini(apiKey: string, ctx: unknown): Promise<CallOutcome> {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await ai.models.generateContent({
      model: KOAN_MODEL,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: KOAN_RESPONSE_SCHEMA,
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 80,
        thinkingConfig: { thinkingBudget: 0 },
      },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(ctx) }],
        },
      ],
    });

    const raw = res.text ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse" };
    }
    const v = validateKoan(parsed);
    if (!v.ok) {
      return { kind: "validation", reason: v.failure.reason };
    }
    return { kind: "ok", value: v.value };
  } catch (err) {
    const ge = isGeminiError(err) ? err : null;
    const status = ge?.status;
    if (status === 401 || status === 403) return { kind: "auth" };
    if (status === 429) return { kind: "ratelimit" };
    return { kind: "transient", status, message: ge?.message };
  }
}

function isRetryable(outcome: CallOutcome): boolean {
  // backup으로 재시도할 가치 있는 실패만 true.
  // validation/parse는 같은 모델이라 backup도 같은 결과 가능성 ↑ → 재시도 안 함.
  return (
    outcome.kind === "auth" ||
    outcome.kind === "ratelimit" ||
    outcome.kind === "transient"
  );
}

function outcomeToErrorResponse(outcome: CallOutcome): Response {
  if (outcome.kind === "auth") {
    return new Response(JSON.stringify({ error: "auth" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (outcome.kind === "ratelimit") {
    return new Response(JSON.stringify({ error: "rate-limit" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }
  if (outcome.kind === "validation") {
    return new Response(
      JSON.stringify({ error: "validate-failed", reason: outcome.reason }),
      {
        status: 503,
        headers: { "content-type": "application/json" },
      }
    );
  }
  if (outcome.kind === "parse") {
    return new Response(JSON.stringify({ error: "parse-failed" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  // transient
  return new Response(JSON.stringify({ error: "upstream" }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const primaryKey = process.env.GEMINI_API_KEY;
  if (!primaryKey) {
    return new Response(JSON.stringify({ error: "no-key" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad-json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const ctx = (body as { context?: unknown })?.context;
  const trigger = (ctx as { trigger?: { rule?: string } })?.trigger;
  if (!ctx || !trigger || typeof trigger.rule !== "string") {
    return new Response(JSON.stringify({ error: "bad-context" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // 1차 시도 — primary key
  const primary = await callGemini(primaryKey, ctx);
  if (primary.kind === "ok") {
    return new Response(JSON.stringify(primary.value), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // primary 실패 사유에 따라 backup 재시도 결정
  if (!isRetryable(primary)) {
    if (primary.kind === "validation") {
      console.warn(
        `[koan-api] primary 검증 reject (${primary.reason}) — backup 시도 안 함 (같은 모델 비용 두 배 회피)`
      );
    } else if (primary.kind === "parse") {
      console.warn(
        `[koan-api] primary JSON 파싱 실패 — backup 시도 안 함`
      );
    }
    return outcomeToErrorResponse(primary);
  }

  // backup 키 확인
  const backupKey = process.env.GEMINI_API_KEY_BACKUP;
  if (!backupKey) {
    console.warn(
      `[koan-api] primary 실패 (${primary.kind}) — backup 키 없음, primary 에러 그대로 반환`
    );
    return outcomeToErrorResponse(primary);
  }

  // 2차 시도 — backup key
  console.log(
    `[koan-api] primary 실패 (${primary.kind}) — backup 키로 재시도`
  );
  const backup = await callGemini(backupKey, ctx);
  if (backup.kind === "ok") {
    console.log(`[koan-api] backup 성공 — 클라엔 200으로 응답`);
    return new Response(JSON.stringify(backup.value), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  console.warn(
    `[koan-api] backup도 실패 (${backup.kind}) — 마지막 에러 status로 응답`
  );
  return outcomeToErrorResponse(backup);
}
