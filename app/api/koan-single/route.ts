// LLM 자막 1라인 생성 API.
// 클라이언트 → POST { context } → Gemini Flash-lite → 검증 → 응답.
// 응답 코드 정책:
//   200 + JSON  : { ko, en }
//   400         : 컨텍스트 누락/형식 오류
//   401         : 인증 실패 (키 잘못됨) — 클라가 circuit open
//   429         : rate limit — 클라가 쿨다운
//   500         : 일반 실패 (네트워크/서버 측) — 클라가 쿨다운
//   503         : 키 부재 또는 검증 게이트 reject — 클라가 짧은 쿨다운

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, KOAN_RESPONSE_SCHEMA, KOAN_MODEL } from "@/lib/koan-prompt";
import { validateKoan } from "@/lib/koan-validate";

export const runtime = "nodejs";

type GeminiError = { status?: number; message?: string };

function isGeminiError(e: unknown): e is GeminiError {
  return typeof e === "object" && e !== null && ("status" in e || "message" in e);
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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
        // 짧은 ko/en 페어 — 60~80 토큰이면 JSON 래퍼 포함 충분.
        maxOutputTokens: 80,
        // Gemini 2.5의 thinking을 비활성. 이 작업은 추론보다 톤·길이 매칭이라
        // thinking 시간이 latency만 추가하고 품질엔 도움 안 됨.
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
      console.warn("[koan-api] JSON 파싱 실패, raw=", raw.slice(0, 200));
      return new Response(JSON.stringify({ error: "parse-failed" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }

    const validated = validateKoan(parsed);
    if (!validated.ok) {
      console.warn(
        `[koan-api] 검증 reject (${validated.failure.reason}) ko="${validated.failure.ko}" en="${validated.failure.en}"`
      );
      return new Response(
        JSON.stringify({ error: "validate-failed", reason: validated.failure.reason }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(validated.value), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const ge = isGeminiError(err) ? err : null;
    const status = ge?.status;
    if (status === 401 || status === 403) {
      return new Response(JSON.stringify({ error: "auth" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    if (status === 429) {
      return new Response(JSON.stringify({ error: "rate-limit" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    console.warn("[koan-api] Gemini 호출 실패", err);
    return new Response(JSON.stringify({ error: "upstream" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
