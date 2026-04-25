"use client";

import { useSyncExternalStore } from "react";
import { captionStore } from "@/lib/caption-store";

function subscribe(cb: () => void) {
  return captionStore.subscribe(cb);
}
function getSnapshot() {
  return captionStore.get();
}
function getServerSnapshot() {
  return captionStore.get();
}

export function SubtitleOverlay() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (snap.phase === "idle") return null;

  return (
    <div className="absolute inset-x-0 bottom-16 z-40 flex justify-center pointer-events-none">
      <div
        className="caption-bar pointer-events-none max-w-[80%] rounded-xl bg-black/75 px-8 py-4 text-center"
        data-phase={snap.phase}
        data-rule={snap.rule}
        data-caption-id={snap.id}
      >
        <div className="text-[22px] leading-relaxed text-white font-normal">
          {snap.ko}
        </div>
        <div className="mt-2 text-[26px] leading-relaxed text-white/90 italic font-light">
          {snap.en}
        </div>
      </div>
    </div>
  );
}
