import type { RuleCategory } from "./trigger-config";

export type CaptionPair = { ko: string; en: string };

// Getting Over It(항아리) 내레이션의 tone / pacing / emotional direction을
// 차용해 새로 작성한 한·영 페어.
// 원칙(README §5 원칙 4·5):
//   - Bennett Foddy 원문 직인용 금지
//   - seed에서 차용할 것: tone, structure, pacing, emotional direction만
//   - 한국어 ≤ 25자, 영어 ≤ 60자 (02_CAPTION_BANK.md §1)
//   - 한국어: 짧고 정확한 리액션/정서
//   - 영어: 차분한 관찰 + 철학적 펀치라인
//   - 두 줄은 같은 말을 반복하지 않고 서로 보완
export const captionBank: Record<RuleCategory, CaptionPair[]> = {
  // 첫 방문 환영(sessionStorage 기반 일회성). 첫 input 이벤트가 user gesture를
  // 만족시키므로 force=true로 발화 → autoplay 정책 통과. 풀에서 1개만 랜덤.
  welcome: [
    { ko: "또 오셨군요. 이번엔 다를까요?",            en: "You're back. We'll see if it's different this time." },
    { ko: "환영합니다. 미리 사과드립니다.",           en: "Welcome. The apology is preemptive." },
    { ko: "키보드는 준비됐습니다. 당신만 남았네요.",  en: "The keyboard is ready. Only you are missing." },
    { ko: "오랜만이라 하기엔, 처음 뵙네요.",          en: "I'd say 'long time no see,' but we just met." },
    { ko: "첫 글자가 가장 솔직합니다. 잘 고르세요.",  en: "The first character is the most honest. Choose well." },
    { ko: "시작이라 부를 만한 것을 시작합시다.",      en: "Let's begin something we can call a beginning." },
    { ko: "시작 버튼은 없습니다. 키보드가 시작입니다.", en: "There's no start button. The keyboard is the start." },
    { ko: "빈 화면이 가장 무거운 화면입니다.",        en: "An empty screen is the heaviest screen." },
    { ko: "환영합니다. 이건 격려가 아닙니다.",        en: "Welcome. This is not encouragement." },
    { ko: "도착하셨군요. 어디인지는 곧 압니다.",      en: "You've arrived. Where, we'll find out shortly." },
    { ko: "한 글자면 시작으로는 충분합니다.",         en: "One character is enough. For a start." },
    { ko: "안녕하세요. 이 인사는 곧 사라집니다.",     en: "Hello. This greeting expires shortly." },
    { ko: "첫 키를 누른 순간, 시계는 시작됩니다.",    en: "The clock began the moment you pressed a key." },
    { ko: "모든 프로젝트는 빈 파일에서 출발합니다.",  en: "Every project begins as an empty file. Sadly." },
    { ko: "환영보다 경고에 가까운 인사입니다.",       en: "Closer to a warning than a welcome, this." },
    { ko: "자리에 앉으셨네요. 가장 힘든 부분이었죠.", en: "You took the seat. That was the hardest part." },
    { ko: "오늘은 다를 거라 말하지 않겠습니다.",      en: "I won't claim today will be different." },
    { ko: "첫 입력은 늘 시범 같죠. 부담 마세요.",     en: "The first keystroke always feels like rehearsal." },
    { ko: "환영합니다. 출구는 좌측 상단입니다.",      en: "Welcome. The exit, for reference, is top-left." },
    { ko: "시작은 되돌릴 수 있습니다. 코드는 아닙니다.", en: "Beginnings are reversible. Code, usually, isn't." },
  ],
  panic: [
    { ko: "속도는 방향이 아닙니다.",              en: "Speed is not direction." },
    { ko: "손이 머리를 기다리고 있지 않습니다.",  en: "Your hands did not wait for a plan." },
    { ko: "진전인지 진동인지 구분이 가지 않는군요.", en: "This could be progress. It could be shaking." },
    { ko: "질주는 멋지죠, 방향이 있을 때는요.",   en: "Running is admirable. Running somewhere, more so." },
    { ko: "키보드만 확신에 차 있습니다.",          en: "The keyboard is the only confident thing here." },
    { ko: "빨라진 건 손가락뿐입니다.",             en: "Only your fingers got faster." },
    { ko: "이건 코딩이 아니라 도주 같군요.",       en: "This reads less like coding, more like fleeing." },
    { ko: "속도로 덮을 수 있는 결함이 아닙니다.",  en: "Some problems are not soluble at 22 keys per second." },
    { ko: "앞으로 가는 게 아니라 멀어지고 있습니다.", en: "You're not advancing. You're receding, quickly." },
    { ko: "빠른 입력은 생각의 알리바이일 뿐입니다.", en: "Typing fast is an alibi for thinking slowly." },
  ],
  backspace: [
    { ko: "백스페이스가 오늘 가장 부지런합니다.",  en: "Backspace has outworked everyone here today." },
    { ko: "2초 전의 당신을 부정하는 중이군요.",    en: "You are at war with the version of you from two seconds ago." },
    { ko: "쓰고 있는 게 아니라 사과하고 있습니다.", en: "You're not writing. You're apologizing." },
    { ko: "작성보다 철회가 두 배 빠르네요.",       en: "The retreat is twice as fast as the advance." },
    { ko: "문장이 완성되기 전에 포기합니다.",      en: "The sentence surrendered before the period arrived." },
    { ko: "지우는 쪽이 더 명확한 의지를 갖고 있군요.", en: "Deleting is the clearest intention you've shown today." },
    { ko: "커서는 당신이 놓은 것을 기억합니다.",   en: "The cursor remembers everything you gave up on." },
    { ko: "후진에도 리듬이 있군요, 그것만은 좋습니다.", en: "There's rhythm in this retreat. Rhythm, at least." },
    { ko: "방금 쓴 것을 방금 취소했습니다. 매번.", en: "Written, then unwritten. Done rhythmically." },
    { ko: "문제는 문장이 아니라 확신 쪽입니다.",   en: "The sentence is fine. The conviction, less so." },
  ],
  silence: [
    { ko: "생각하는 게 아니라 응시하고 있습니다.", en: "This isn't thought. This is staring." },
    { ko: "화면은 기다립니다. 그건 친절이 아닙니다.", en: "The screen is patient. That's not the same as kind." },
    { ko: "커서도 조금 피곤해 보입니다.",           en: "Even the cursor looks tired now." },
    { ko: "모든 멈춤이 시작의 전조는 아닙니다.",   en: "Not every pause is a prelude." },
    { ko: "침묵이 길어지면 핑계는 짧아집니다.",    en: "The longer the silence, the shorter the excuse." },
    { ko: "해결 중이 아닙니다. 애도 중입니다.",    en: "You're not solving. You're grieving, quietly." },
    { ko: "해결의 침묵과 체념의 침묵은 모양이 다릅니다.", en: "Some silences solve. This one just sits there." },
    { ko: "당신은 떠났습니다. 커서는 몰랐을 뿐이죠.", en: "You left. The cursor didn't get the memo." },
    { ko: "정지 화면 뒤에서 결심이 사라지고 있습니다.", en: "Behind the still screen, resolve is quietly leaving." },
    { ko: "30초 동안 아무 일도 일어나지 않았습니다.", en: "Thirty seconds of absolutely nothing. Catalogued." },
  ],
  // Rule D — 책상 침, 한숨, 갑작스러운 소리. 감정이 논리를 추월한 순간.
  // 자동 감지(마이크 dB)는 아직 미구현이지만 수동 트리거(Ctrl+Alt+4)용으로 풀은 채워둠.
  noise: [
    { ko: "방금 감정이 논리를 추월했습니다.",       en: "Emotion just overtook logic by a full lap." },
    { ko: "책상은 반응했고, 시스템은 가만히 있습니다.", en: "The desk heard that. The compiler did not." },
    { ko: "키보드 소리가 아닙니다. 사람 소리네요.", en: "That was not a keystroke. That was a person." },
    { ko: "한숨이 방금 입력 장치를 앞질렀습니다.",  en: "The sigh arrived before the keystroke did." },
    { ko: "방은 들었습니다. 버그는 듣지 않았고요.", en: "The room heard you. The bug remained indifferent." },
    { ko: "그건 진전이 아니라 기후였습니다.",        en: "That sound was not progress. That was weather." },
    { ko: "감정이 먼저 완료되었습니다. 코드는 아직요.", en: "The feeling finished compiling. The code did not." },
    { ko: "타이핑보다 숨소리가 더 솔직해졌군요.",   en: "Your breathing is more honest than your typing now." },
    { ko: "방금 것은 의견이었습니다. 주로 감정이지만요.", en: "That was an opinion. Mostly emotional, technically valid." },
    { ko: "물리 세계가 먼저 결론에 도달했습니다.",  en: "The physical world got there before the code did." },
  ],
  // Rule E — Esc/Enter/Space 연타/꾹 누름. 문제에 반응만 하고 있는 상태.
  keyrepeat: [
    { ko: "반응하는 것과 푸는 것은 다릅니다.",     en: "Reacting is not solving. They just rhyme." },
    { ko: "같은 키를 누르면 같은 대답이 옵니다.",  en: "Same key, same answer. Every single time." },
    { ko: "엔터는 답이 아니라 질문입니다.",        en: "Enter is a question. It rarely answers." },
    { ko: "Esc는 도망이 아니라, 좌석만 옮긴 것입니다.", en: "Escape moves the seat, not the problem." },
    { ko: "컴파일러는 당신보다 참을성이 많습니다.", en: "The compiler has more patience than you do." },
    { ko: "이건 디버깅이 아니라 기도 같군요.",     en: "This stopped being debugging. It became liturgy." },
    { ko: "문을 세게 두드린다고 잠금이 풀리진 않습니다.", en: "Knocking harder is not how a locked door opens." },
    { ko: "키보드는 협상하지 않습니다.",            en: "The keyboard is not negotiating with you." },
    { ko: "더 작은 버튼을 찾아낸 속도는 인상적입니다.", en: "Impressive speed at finding something smaller to blame." },
    { ko: "같은 키가 방금 전과 같은 기분을 준 건 아닙니다.", en: "The same key, but somehow angrier this time." },
  ],
};

export function pickDifferent(
  pool: CaptionPair[],
  lastIdx: number
): { idx: number; value: CaptionPair } | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return { idx: 0, value: pool[0] };
  let idx = Math.floor(Math.random() * pool.length);
  if (idx === lastIdx) idx = (idx + 1) % pool.length;
  return { idx, value: pool[idx] };
}
