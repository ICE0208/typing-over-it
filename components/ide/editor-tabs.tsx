"use client";

import { X, FileCode, FileJson, FileText, File as FileIcon } from "lucide-react";

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "json") return <FileJson size={14} className="text-yellow-400" />;
  if (ext === "md") return <FileText size={14} className="text-sky-400" />;
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx")
    return <FileCode size={14} className="text-blue-400" />;
  return <FileIcon size={14} className="text-[#cccccc]" />;
}

export function EditorTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
}: {
  tabs: { id: string; name: string; dirty?: boolean }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="h-[35px] shrink-0 bg-[#252526] flex items-end overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <div
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`group h-[35px] flex items-center gap-2 pl-3 pr-2 border-r border-[#1e1e1e] cursor-pointer text-[13px] ${
              active
                ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]"
                : "bg-[#2d2d2d] text-[#969696] hover:text-white"
            }`}
          >
            {iconFor(t.name)}
            <span>{t.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.id);
              }}
              className="size-5 grid place-items-center rounded hover:bg-white/10"
              aria-label="Close"
            >
              {t.dirty ? (
                <span className="size-2 rounded-full bg-current opacity-80" />
              ) : (
                <X size={14} className="opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>
        );
      })}
      <div className="flex-1 h-full bg-[#252526]" />
    </div>
  );
}
