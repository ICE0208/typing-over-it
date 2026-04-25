import { captionBank, pickDifferent, type CaptionPair } from "./caption-bank";
import { speakCaption, stopCaption } from "./caption-tts";
import { captionStore, type Phase } from "./caption-store";
import { editorContextRef } from "./editor-context-ref";
import { getRecentContent } from "./recent-content-tracker";
import { requestKoan } from "./koan-client";
import { buildKoanContext } from "./koan-prompt";
import {
  CAPTION_TIMING,
  priorityIndex,
  type RuleCategory,
} from "./trigger-config";

export type FireMeta = {
  reason: string;
  metrics: Record<string, number | string>;
};

export type FireOpts = {
  force?: boolean;
  meta?: FireMeta; // 있으면 LLM 호출 시도, 실패 시 시드 fallback
};

export class SubtitleScheduler {
  private phase: Phase = "idle";
  private currentRule: RuleCategory | null = null;
  private lastIdxByCategory: Map<RuleCategory, number> = new Map();

  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private nextId = 1;
  // fire 호출이 비동기라 응답 사이 새 fire가 와서 stale인지 확인용 카운터.
  private fireSeq = 0;

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearPhaseTimer();
    this.phase = "idle";
    stopCaption();
    captionStore.reset();
  }

  /**
   * 자동 감지 또는 수동 트리거가 새 룰을 쏠 때.
   * - opts.force=true 면 모든 게이트(페이드아웃·페이드인·우선순위)를 무시하고
   *   phase가 뭐든 즉시 현재 자막을 interrupt하고 새 자막을 띄운다.
   *   단 자막 풀이 비어있으면 보여줄 내용이 없으므로 스킵.
   * - opts.meta 가 있으면 LLM 호출 시도. 실패/타임아웃/abort 시 시드 풀로 fallback.
   *   응답 도중 새 fire가 들어왔으면(fireSeq 변화) emit 안 함 — 마지막 트리거가 이김.
   */
  async fire(rule: RuleCategory, opts?: FireOpts): Promise<void> {
    if (this.disposed) return;

    const force = opts?.force === true;
    const meta = opts?.meta;

    // 풀 없으면 조용히 무시. LLM 호출도 안 함.
    const pool = captionBank[rule];
    if (!pool || pool.length === 0) {
      console.log(
        `[TypingOverIt] [거절] rule=${rule} 이유=자막 풀이 비어있음`
      );
      return;
    }

    if (!force) {
      // fade-out / easing-in 중에는 새 트리거 무시 (스펙)
      if (this.phase === "fading-out") {
        console.log(
          `[TypingOverIt] [거절] rule=${rule} 이유=이전 자막이 페이드아웃 중 (fade-out은 interrupt 불가)`
        );
        return;
      }
      if (this.phase === "easing-in") {
        console.log(
          `[TypingOverIt] [거절] rule=${rule} 이유=이전 자막이 페이드인 중 (깜빡임 방지)`
        );
        return;
      }

      if (this.phase === "holding" && this.currentRule) {
        const curPriority = priorityIndex(this.currentRule);
        const newPriority = priorityIndex(rule);
        // 더 높은 우선순위(index 작음)만 interrupt
        if (newPriority >= curPriority) {
          console.log(
            `[TypingOverIt] [거절] rule=${rule} 이유=현재 표시 중인 ${this.currentRule}보다 우선순위 같거나 낮음`
          );
          return;
        }
        console.log(
          `[TypingOverIt] [교체] 기존=${this.currentRule} → 새=${rule} (우선순위 더 높아서 즉시 interrupt)`
        );
      }
    } else if (this.phase !== "idle") {
      console.log(
        `[TypingOverIt] [강제 교체] rule=${rule} — 기존 phase=${this.phase} (${this.currentRule ?? "?"}) 무시하고 발화`
      );
    }

    // 이 fire의 고유 ID. 응답 도중 새 fire 도착하면 fireSeq가 다른 값이 됨.
    const myId = ++this.fireSeq;

    let pair: CaptionPair | null = null;
    let source: "Gemini" | "로컬-시드" = "로컬-시드";
    let seedIdx: number | null = null;

    if (meta) {
      // LLM 호출 (1~2초 비동기 대기). abort/실패 시 null.
      const ctx = editorContextRef.get();
      const recent = getRecentContent();
      const koanCtx = buildKoanContext(
        { rule, reason: meta.reason, metrics: meta.metrics },
        ctx,
        recent
      );
      const llm = await requestKoan(koanCtx);

      // 응답 사이에 새 fire 도착했으면 우리는 stale → emit 안 함
      if (this.disposed || this.fireSeq !== myId) {
        console.log(
          `[TypingOverIt] [건너뜀] rule=${rule} 이유=새 트리거가 도착해 stale (시드/LLM 둘 다 emit 안 함)`
        );
        return;
      }

      if (llm) {
        pair = { ko: llm.ko, en: llm.en };
        source = "Gemini";
      }
    }

    if (!pair) {
      const seed = pickDifferent(
        pool,
        this.lastIdxByCategory.get(rule) ?? -1
      );
      if (!seed) return;
      pair = seed.value;
      seedIdx = seed.idx;
      this.lastIdxByCategory.set(rule, seed.idx);
    }

    if (this.disposed || this.fireSeq !== myId) return;

    const sourceTag = source === "Gemini" ? "Gemini" : "로컬-시드";
    const detail =
      source === "Gemini"
        ? "동적 생성"
        : meta
          ? `호출 실패/취소 후 fallback (idx=${seedIdx})`
          : `메타 없음 — 시드 풀에서 직행 (idx=${seedIdx})`;
    console.log(
      `[TypingOverIt] [${force ? "강제 발화" : "발화"}] [${sourceTag}] rule=${rule} (${detail})  ko="${pair.ko}"  en="${pair.en}"`
    );

    this.emit(rule, pair);
  }

  /** Cmd+Shift+0: phase 무관 즉시 제거 (짧은 페이드) */
  clear() {
    if (this.disposed) return;
    if (this.phase === "idle") return;
    console.log(
      `[TypingOverIt] [수동 제거] 진행 중이던 phase=${this.phase}에서 짧은 페이드로 종료`
    );
    this.clearPhaseTimer();
    const snap = captionStore.get();
    if (snap.phase === "idle") {
      this.phase = "idle";
      return;
    }
    // 짧은 페이드로 마무리
    captionStore.set({ ...snap, phase: "fading-out" });
    this.phase = "fading-out";
    stopCaption();
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      this.phase = "idle";
      this.currentRule = null;
      captionStore.reset();
    }, CAPTION_TIMING.clearFadeMs);
  }

  private emit(rule: RuleCategory, pair: CaptionPair) {
    this.clearPhaseTimer();

    this.currentRule = rule;
    this.phase = "easing-in";

    const id = this.nextId++;
    captionStore.set({
      phase: "easing-in",
      ko: pair.ko,
      en: pair.en,
      rule,
      id,
    });
    // 자막이 떠오를 때 영문 라인을 음성으로 같이 내보낸다. speakCaption 자체가
    // 매번 synth.cancel()을 호출하므로 interrupt·force·연속 발화의 음성 정리는 자동.
    speakCaption(pair.en);

    // ease-in 완료 → holding
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      if (this.disposed) return;
      const snap = captionStore.get();
      if (snap.phase === "idle") return;
      captionStore.set({ ...snap, phase: "holding" });
      this.phase = "holding";

      // holding 완료 → fading-out
      this.phaseTimer = setTimeout(() => {
        this.phaseTimer = null;
        if (this.disposed) return;
        const holdSnap = captionStore.get();
        if (holdSnap.phase === "idle") return;
        captionStore.set({ ...holdSnap, phase: "fading-out" });
        this.phase = "fading-out";
        // 긴 라인이 holding 끝까지 발화 중이면 fading-out과 함께 음성도 cut.
        // 짧은 라인은 이미 자연 종료된 상태라 cancel은 무해.
        stopCaption();

        // fade-out 완료 → idle
        this.phaseTimer = setTimeout(() => {
          this.phaseTimer = null;
          if (this.disposed) return;
          this.phase = "idle";
          this.currentRule = null;
          captionStore.reset();
        }, CAPTION_TIMING.fadeOutMs);
      }, CAPTION_TIMING.holdMs);
    }, CAPTION_TIMING.fadeInMs);
  }

  private clearPhaseTimer() {
    if (this.phaseTimer !== null) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }
}
