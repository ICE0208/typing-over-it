"use client";

import {
  Files,
  Search,
  GitBranch,
  Bug,
  Boxes,
  Settings,
  CircleUser,
} from "lucide-react";

const top = [
  { icon: Files, label: "Explorer", active: true },
  { icon: Search, label: "Search" },
  { icon: GitBranch, label: "Source Control" },
  { icon: Bug, label: "Run and Debug" },
  { icon: Boxes, label: "Extensions" },
];

const bottom = [
  { icon: CircleUser, label: "Account" },
  { icon: Settings, label: "Manage" },
];

export function ActivityBar() {
  return (
    <div className="w-12 shrink-0 bg-[#333333] flex flex-col items-center justify-between py-1">
      <div className="flex flex-col">
        {top.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            title={label}
            className={`relative w-12 h-12 grid place-items-center text-[#858585] hover:text-white ${
              active ? "text-white" : ""
            }`}
          >
            {active && (
              <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-white" />
            )}
            <Icon size={22} strokeWidth={1.4} />
          </button>
        ))}
      </div>
      <div className="flex flex-col">
        {bottom.map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="w-12 h-12 grid place-items-center text-[#858585] hover:text-white"
          >
            <Icon size={22} strokeWidth={1.4} />
          </button>
        ))}
      </div>
    </div>
  );
}
