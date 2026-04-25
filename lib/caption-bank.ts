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
    { ko: "또 오셨군요. 이번엔 다를지, 글쎄요.",     en: "You're back. We'll see if it's different this time." },
    { ko: "환영합니다. 미리 사과드립니다.",           en: "Welcome. The apology is preemptive." },
    { ko: "키보드는 준비됐습니다. 당신만 남았네요.",  en: "The keyboard is ready. Only you are missing." },
    { ko: "오랜만이라 하기엔, 처음 뵙네요.",          en: "I'd say 'long time no see,' but we just met." },
    { ko: "첫 글자가 가장 솔직합니다. 잘 고르세요.",  en: "The first character is the most honest. Choose well." },
    { ko: "시작이라 부를 만한 것을 시작합시다.",      en: "Let's begin something we can call a beginning." },
    { ko: "시작 버튼은 없습니다. 키보드가 시작입니다.", en: "There's no start button. The keyboard is the start." },
    { ko: "빈 화면이 가장 무거운 화면입니다.",        en: "An empty screen is the heaviest screen." },
    { ko: "환영해. 격려랑은 다른 종류로.",           en: "Welcome. Of a different kind." },
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
    { ko: "시작은 되돌릴 수 있어. 코드는 글쎄.",    en: "Beginnings are reversible. Code, usually, isn't." },
  ],
  panic: [
    { ko: "손가락이 너보다 먼저 도착했네.",         en: "The fingers arrived before you did." },
    { ko: "어깨에 힘 들어간 거 다 보이지.",         en: "I can see the shoulders climbing." },
    { ko: "호흡이 키보드를 못 따라가더라.",         en: "The breath fell behind the hands." },
    { ko: "지금이 가장 빠른 너야. 그게 슬프지.",    en: "This is the fastest you. Which is sad." },
    { ko: "질주는 멋지지, 방향이 있을 때는.",       en: "Running is admirable. Running somewhere, more so." },
    { ko: "타닥타닥, 운율은 좋더라.",                en: "A nice rhythm. Going nowhere in particular." },
    { ko: "키보드만 부지런하네, 다행이지.",         en: "Only the keyboard is busy. Lucky us." },
    { ko: "빨라진 건 손가락뿐이야.",                 en: "Only your fingers got faster." },
    { ko: "타이핑이 생각의 알리바이가 됐네.",        en: "Typing fast is an alibi for thinking slowly." },
    { ko: "손가락 속도만 자라고 있어.",              en: "Only the fingertips are getting smarter." },
  ],
  backspace: [
    { ko: "백스페이스가 오늘 가장 부지런하네.",     en: "Backspace has outworked everyone here today." },
    { ko: "2초 전의 너랑 싸우는 중이지.",            en: "At war with the you from two seconds back." },
    { ko: "지운 자리가 손목에 남아있어.",            en: "The deletions live on in your wrist." },
    { ko: "또 지우네. 우리 다 그렇게 시작하잖아.",  en: "Erasing. We all start like this." },
    { ko: "작성보다 철회가 두 배 빠르네.",          en: "The retreat is twice as fast as the advance." },
    { ko: "문장이 완성되기 전에 포기하더라.",       en: "The sentence surrendered before the period arrived." },
    { ko: "지우는 쪽 의지가 가장 단단해 보이는데.", en: "Deleting is the clearest intention you've shown today." },
    { ko: "커서는 네가 놓은 것을 다 기억해.",        en: "The cursor remembers everything you gave up on." },
    { ko: "후진에도 리듬이 있네, 기특하지.",         en: "There's rhythm in this retreat. Rhythm, at least." },
    { ko: "썼다 지웠다, 손목 운동은 충실하구나.",   en: "Written, unwritten. The wrist trained well today." },
  ],
  silence: [
    { ko: "어깨가 무거워진 거 보여.",               en: "Your shoulders dropped a centimeter." },
    { ko: "화면이 기다리는 건 친절이랑 다르지.",     en: "The screen waits. Patience, not kindness." },
    { ko: "커서도 너 닮아간다, 점점.",              en: "Even the cursor looks tired now." },
    { ko: "30초째 같이 멍 때리는 중이지.",          en: "Thirty seconds. We've been still together." },
    { ko: "침묵이 길어지면 핑계는 짧아지더라.",     en: "The longer the silence, the shorter the excuse." },
    { ko: "해결이 아니라 애도 중인 거 같은데.",      en: "Not solving. Grieving, quietly." },
    { ko: "손이 자판 위에서 길을 잃었네.",          en: "The hands forgot what they were looking for." },
    { ko: "너는 떠났고, 커서만 남아있어.",           en: "You left. The cursor didn't get the memo." },
    { ko: "숨소리만 남은 자리야.",                   en: "Only the breath remains in the room." },
    { ko: "30초 동안 아무 일도 일어나지 않았어.",   en: "Thirty seconds of absolutely nothing. Catalogued." },
  ],
  // Rule D — 책상 침, 한숨, 갑작스러운 소리. 감정이 논리를 추월한 순간.
  // 자동 감지(마이크 dB)는 아직 미구현이지만 수동 트리거(Ctrl+Alt+4)용으로 풀은 채워둠.
  noise: [
    { ko: "방금 감정이 논리를 추월했네.",           en: "Emotion just overtook logic by a full lap." },
    { ko: "책상은 반응했고, 시스템은 조용하지.",    en: "The desk heard that. The compiler did not." },
    { ko: "키보드 소리가 사람 소리로 바뀌었네.",    en: "That was not a keystroke. That was a person." },
    { ko: "한숨이 키보드보다 빨랐어.",              en: "The sigh arrived before the keystroke did." },
    { ko: "방은 들었어. 버그는 무관심하지만.",       en: "The room heard you. The bug remained indifferent." },
    { ko: "그 소리, 의자가 먼저 받아냈어.",          en: "The chair caught that one before the file did." },
    { ko: "감정은 컴파일됐고, 코드는 아직이지.",    en: "The feeling finished compiling. The code did not." },
    { ko: "타이핑보다 숨소리가 솔직하더라.",        en: "Your breathing is more honest than your typing now." },
    { ko: "한숨이 커밋 메시지로 충분하지.",         en: "That sigh would commit cleanly." },
    { ko: "물리 세계가 먼저 결론에 도달했어.",      en: "The physical world got there before the code did." },
  ],
  // Rule E — Esc/Enter/Space 연타/꾹 누름. 문제에 반응만 하고 있는 상태.
  keyrepeat: [
    { ko: "엔터 세 번째에도 같은 메시지지.",         en: "The third Enter said the same thing." },
    { ko: "같은 키, 같은 대답이 오더라.",            en: "Same key, same answer. Every single time." },
    { ko: "Esc 손가락이 운동 중이네.",               en: "The Esc finger is doing its cardio." },
    { ko: "Esc는 좌석만 옮길 뿐이지.",              en: "Escape moves the seat, not the problem." },
    { ko: "컴파일러가 너보다 참을성 많은 거 알지.", en: "The compiler has more patience than you do." },
    { ko: "디버깅이 기도로 바뀌는 순간이네.",       en: "This stopped being debugging. It became liturgy." },
    { ko: "키보드도 너 닮아간다, 점점.",             en: "The keyboard's catching your habits." },
    { ko: "키보드는 협상하지 않는데.",              en: "The keyboard is not negotiating with you." },
    { ko: "더 작은 버튼 찾는 속도, 인상적이야.",     en: "Impressive speed at finding something smaller to blame." },
    { ko: "같은 키가 점점 더 화나 보이네.",         en: "The same key, but somehow angrier this time." },
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
