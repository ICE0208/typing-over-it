"use client";

import {
  GitBranch,
  CircleAlert,
  CircleX,
  Bell,
  Check,
} from "lucide-react";

export function StatusBar({
  language,
  line,
  column,
  dirty,
}: {
  language: string;
  line: number;
  column: number;
  dirty?: boolean;
}) {
  return (
    <div className="h-[22px] shrink-0 bg-[#007acc] text-white text-[12px] flex items-center px-2 gap-3 select-none">
      <div className="flex items-center gap-1">
        <GitBranch size={13} />
        <span>main*</span>
      </div>
      <div className="flex items-center gap-1">
        <CircleX size={13} />
        <span>0</span>
        <CircleAlert size={13} className="ml-1" />
        <span>0</span>
      </div>
      <div className="flex-1" />
      {dirty && <div className="opacity-90">● 변경됨</div>}
      <div>Ln {line}, Col {column}</div>
      <div>Spaces: 2</div>
      <div>UTF-8</div>
      <div>LF</div>
      <div className="capitalize">{language}</div>
      <div className="flex items-center gap-1">
        <Check size={13} />
        <span>Prettier</span>
      </div>
      <Bell size={13} />
    </div>
  );
}
