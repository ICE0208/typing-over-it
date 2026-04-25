"use client";

import { useEffect } from "react";
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
    const scheduler = new SubtitleScheduler();
    const detector = new TypingDetector({
      onTrigger: (rule) => scheduler.fire(rule),
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
          `[TypingOverIt] [수동] ${MANUAL_MODIFIER_LABEL}+${digit} → ${mapping} (모든 규칙 무시하고 강제 발화)`
        );
        scheduler.fire(mapping as RuleCategory, { force: true });
      }
    };
    window.addEventListener("keydown", onManualKey, { capture: true });

    return () => {
      window.removeEventListener("keydown", onManualKey, { capture: true });
      detector.dispose();
      scheduler.dispose();
    };
  }, []);

  return null;
}
