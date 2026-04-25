"use client";

import { useEffect } from "react";
import { initCaptionTTS, disposeCaptionTTS } from "@/lib/caption-tts";
import { disposeKoanClient } from "@/lib/koan-client";
import { SubtitleScheduler } from "@/lib/subtitle-scheduler";
import { TypingDetector } from "@/lib/typing-detector";
import {
  MANUAL_KEYS,
  MANUAL_MODIFIER,
  MANUAL_MODIFIER_LABEL,
  type RuleCategory,
} from "@/lib/trigger-config";

export function TypingEngineHost() {
  useEffect(() => {
    initCaptionTTS();
    const scheduler = new SubtitleScheduler();
    const detector = new TypingDetector({
      onTrigger: (rule, meta) => {
        // 자동 트리거는 detector가 만든 reason/metrics를 그대로 LLM 컨텍스트로 전달.
        void scheduler.fire(rule, { meta });
      },
    });

    // 수동 트리거 — Ctrl+Alt+1~5, Ctrl+Alt+0
    // macOS: Cmd+Shift+3/4/5가 시스템 스크린샷 단축키라 브라우저까지 오지 않음.
    // Ctrl+Alt 조합은 macOS/Chrome/Monaco 어디에도 기본 바인딩이 없어 안전.
    const onManualKey = (e: KeyboardEvent) => {
      if (e.ctrlKey !== MANUAL_MODIFIER.ctrlKey) return;
      if (e.altKey !== MANUAL_MODIFIER.altKey) return;
      if (e.shiftKey !== MANUAL_MODIFIER.shiftKey) return;
      if (e.metaKey !== MANUAL_MODIFIER.metaKey) return;

      // macOS에서 Option+숫자는 특수문자('¡', '™' 등)가 되므로 e.key 대신
      // 키보드 레이아웃 독립적인 e.code('Digit1' 등)로 숫자 판정.
      let digit: string | null = null;
      if (e.code && e.code.startsWith("Digit")) {
        digit = e.code.slice(5);
      } else if (e.code && e.code.startsWith("Numpad")) {
        digit = e.code.slice(6);
      } else if (/^[0-9]$/.test(e.key)) {
        digit = e.key;
      }
      if (digit === null) return;

      const mapping = MANUAL_KEYS[digit];
      if (!mapping) return;

      e.preventDefault();
      e.stopPropagation();

      if (mapping === "clear") {
        console.log(
          `[TypingOverIt] [수동] ${MANUAL_MODIFIER_LABEL}+0 → 자막 즉시 제거 요청`
        );
        scheduler.clear();
      } else {
        console.log(
          `[TypingOverIt] [수동] ${MANUAL_MODIFIER_LABEL}+${digit} → ${mapping} (강제 발화, LLM 컨텍스트 포함)`
        );
        void scheduler.fire(mapping as RuleCategory, {
          force: true,
          meta: {
            reason: `User manually triggered the ${mapping} caption via ${MANUAL_MODIFIER_LABEL}+${digit}`,
            metrics: { manual: 1 },
          },
        });
      }
    };
    window.addEventListener("keydown", onManualKey, { capture: true });

    // 첫 방문 환영 — 새로고침마다 재무장. 영속 저장 없이 effect 클로저 내 1회 가드만 둠.
    // 첫 keydown이 user gesture를 만족시키므로 force=true로 발화하면 TTS도 autoplay 통과.
    const onFirstKey = () => {
      window.removeEventListener("keydown", onFirstKey, { capture: true });
      console.log(
        "[TypingOverIt] [환영] 첫 keydown 감지 → welcome 강제 발화 (LLM 안 거치고 caption-bank.welcome 시드 풀에서 즉시 픽)"
      );
      // 첫 인상은 1~2초 LLM 대기가 어색하므로 무조건 로컬 시드.
      // caption-bank.ts L17-38의 welcome 풀 20개 중 1개 랜덤.
      void scheduler.fire("welcome", { force: true });
    };
    window.addEventListener("keydown", onFirstKey, { capture: true });

    return () => {
      window.removeEventListener("keydown", onManualKey, { capture: true });
      window.removeEventListener("keydown", onFirstKey, { capture: true });
      detector.dispose();
      scheduler.dispose();
      disposeCaptionTTS();
      disposeKoanClient();
    };
  }, []);

  return null;
}
