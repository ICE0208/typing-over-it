"use client";

import { Minus, Square, X } from "lucide-react";

const menus = ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];

export function TitleBar() {
  return (
    <div className="h-[30px] shrink-0 bg-[#3c3c3c] flex items-center text-[12px] select-none">
      <div className="px-3 text-[#cccccc]/80 flex items-center gap-2">
        <div className="size-3 rounded-sm bg-[#007acc]" />
        <span>VS Code</span>
      </div>
      <div className="flex items-center">
        {menus.map((m) => (
          <button
            key={m}
            className="px-2 h-[30px] hover:bg-white/10 text-[#cccccc]"
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex-1 flex justify-center text-[#cccccc]/80">
        ide-demo — Visual Studio Code
      </div>
      <div className="flex items-center h-full">
        <button className="w-11 h-full grid place-items-center hover:bg-white/10">
          <Minus size={14} />
        </button>
        <button className="w-11 h-full grid place-items-center hover:bg-white/10">
          <Square size={11} />
        </button>
        <button className="w-11 h-full grid place-items-center hover:bg-red-600">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
