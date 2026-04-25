// Web Speech API (SpeechSynthesis) 래퍼.
// 자막이 떠오를 때 영문 라인을 시스템 보이스로 발화한다.
//
// 알려진 함정 + 대응:
//   1. Chrome desktop의 getVoices()는 마운트 직후 빈 배열 반환 → voiceschanged 이벤트 + 즉시 호출 dual-pattern.
//   2. Cloud voice의 14초 cutoff(Chromium issue 41294170) → localService 보이스 우선 선택 + setInterval pause/resume 가드.
//   3. cancel() 직후 speak() 무시 race(Bugzilla 1522074) → setTimeout(speak, 50).
//   4. SSR/hydration → 모든 진입부에서 typeof window 가드, 모듈 top-level에서 window 접근 금지.

let englishVoice: SpeechSynthesisVoice | null = null;
let voicesListener: (() => void) | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  if (!("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

// 알려진 남성 영문 보이스 화이트리스트(OS 무관). 체인의 모든 fallback은
// 이 목록 안에서만 픽한다 → en-GB 어떤 보이스든 같은 식의 여성-우연-매칭 차단.
const MALE_VOICE_NAMES = [
  // macOS en-GB 남성
  "Daniel",
  "Oliver",
  "Arthur",
  // macOS en-US 남성
  "Aaron",
  "Alex",
  "Fred",
  // macOS en-IE/en-AU 남성
  "Tom",
  "Lee",
  // Windows en-GB / en-US 남성
  "George",
  "Ryan",
  "David",
  "Mark",
  "James",
  "Guy",
  // Chrome cloud (OS 무관)
  "Google UK English Male",
];

function isMaleByName(v: SpeechSynthesisVoice): boolean {
  return MALE_VOICE_NAMES.some((m) => v.name.includes(m));
}

function selectEnglishVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  // Foddy(항아리 게임) 나레이션 톤 — 영국 억양 남성 우선, 그 다음 미국 남성.
  // 마지막까지도 남성 보이스를 못 잡으면 그제야 영문 아무 보이스(여성 가능).
  // Web Speech API는 gender 필드가 없어서 화이트리스트 이름 매칭으로 판별.

  const males = voices.filter(isMaleByName);
  const enMales = males.filter((v) => v.lang.startsWith("en"));

  // 1순위: 영국 남성 (local)
  const ukMaleLocal = enMales.find(
    (v) => v.lang.startsWith("en-GB") && v.localService
  );
  if (ukMaleLocal) return ukMaleLocal;

  // 2순위: 영국 남성 (cloud 포함)
  const ukMale = enMales.find((v) => v.lang.startsWith("en-GB"));
  if (ukMale) return ukMale;

  // 3순위: 미국 남성 (local) — Aaron, Alex, Microsoft David/Mark 등
  const usMaleLocal = enMales.find(
    (v) => v.lang.startsWith("en-US") && v.localService
  );
  if (usMaleLocal) return usMaleLocal;

  // 4순위: 어떤 영문 남성이든 (cloud 포함)
  const anyEnMale = enMales[0];
  if (anyEnMale) return anyEnMale;

  // 5순위: 어떤 남성 보이스든 (lang 무관)
  if (males[0]) return males[0];

  // 최종 fallback — 남성 보이스가 전혀 없으면 영문 아무거나 (성별 무관)
  return (
    voices.find((v) => v.lang === "en-GB" && v.localService) ??
    voices.find((v) => v.lang === "en-US" && v.localService) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

export function initCaptionTTS() {
  const synth = getSynth();
  if (!synth) return;
  if (voicesListener) return; // 이미 초기화됨 (idempotent)

  const load = () => {
    const voices = synth.getVoices();
    if (voices.length === 0) return;
    const prev = englishVoice?.name;
    englishVoice = selectEnglishVoice(voices);
    if (englishVoice && englishVoice.name !== prev) {
      console.log(
        `[TypingOverIt] [TTS] 보이스 선택됨: name="${englishVoice.name}" lang=${englishVoice.lang} localService=${englishVoice.localService}`
      );
    } else if (!englishVoice) {
      console.warn(
        `[TypingOverIt] [TTS] 영문 보이스를 찾지 못함 — 가용 보이스 ${voices.length}개. OS 기본 음성으로 발화됩니다.`
      );
    }
  };
  voicesListener = load;
  load(); // Safari/Firefox: 동기 반환
  synth.addEventListener("voiceschanged", load); // Chrome: 비동기 도착
}

export function speakCaption(text: string) {
  const synth = getSynth();
  if (!synth) return;

  // 이전 발화 즉시 중단. 큐에 쌓인 utterance도 함께 비움.
  synth.cancel();

  const u = new SpeechSynthesisUtterance(text);
  // 영국 보이스가 잡혔으면 lang도 en-GB. 못 잡았을 때 OS 기본은 en-US fallback.
  u.lang = englishVoice?.lang ?? "en-GB";
  if (englishVoice) {
    u.voice = englishVoice;
  } else {
    console.warn(
      `[TypingOverIt] [TTS] 발화 시점에 보이스 미선택 상태 — voiceschanged 미도착이거나 영문 보이스 부재. OS 기본음으로 발화.`
    );
  }
  // 항아리 게임 Foddy 나레이션 톤 — 살짝 느릿하고 낮은 피치로 깐족거리는 느낌.
  u.rate = 0.88; // 살짝 느리게 (안전 한계 0.5~2.0)
  u.pitch = 0.75; // 낮게 (안전 한계 0.5~1.5)
  u.volume = 1.0;

  // 14초 cutoff 가드. localService 보이스면 무해, cloud 보이스면 발화 유지.
  const intervalId = window.setInterval(() => {
    if (synth.speaking) {
      synth.pause();
      synth.resume();
    }
  }, 13000);
  const cleanup = () => window.clearInterval(intervalId);
  u.onend = cleanup;
  u.onerror = cleanup;

  // cancel→speak race window(~50ms) 우회. user activation transient(~5s) 안이라 autoplay 영향 없음.
  window.setTimeout(() => synth.speak(u), 50);
}

export function stopCaption() {
  const synth = getSynth();
  if (!synth) return;
  synth.cancel();
}

export function disposeCaptionTTS() {
  const synth = getSynth();
  if (!synth) return;
  if (voicesListener) {
    synth.removeEventListener("voiceschanged", voicesListener);
    voicesListener = null;
  }
  synth.cancel();
  englishVoice = null;
}
