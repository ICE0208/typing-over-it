"use client";

import { Tree, NodeRendererProps } from "react-arborist";
import { ChevronRight, ChevronDown, FileCode, FileText, FileJson, File as FileIcon } from "lucide-react";
import type { FsNode } from "@/lib/fake-fs";
import { useEffect, useRef, useState } from "react";

function iconFor(name: string, isFolder: boolean, isOpen: boolean) {
  if (isFolder)
    return isOpen ? (
      <ChevronDown size={14} className="text-[#cccccc]" />
    ) : (
      <ChevronRight size={14} className="text-[#cccccc]" />
    );
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "json") return <FileJson size={14} className="text-yellow-400" />;
  if (ext === "md") return <FileText size={14} className="text-sky-400" />;
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx")
    return <FileCode size={14} className="text-blue-400" />;
  return <FileIcon size={14} className="text-[#cccccc]" />;
}

function Node({ node, style, dragHandle }: NodeRendererProps<FsNode>) {
  const isFolder = !!node.data.children;
  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={() => (isFolder ? node.toggle() : node.select())}
      className={`flex items-center gap-1 h-[22px] pr-2 cursor-pointer text-[13px] ${
        node.isSelected ? "bg-[#094771] text-white" : "hover:bg-[#2a2d2e]"
      }`}
    >
      <div className="w-4 grid place-items-center">
        {isFolder ? (
          node.isOpen ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )
        ) : null}
      </div>
      <div className="grid place-items-center">
        {iconFor(node.data.name, isFolder, node.isOpen)}
      </div>
      <span className="truncate">{node.data.name}</span>
    </div>
  );
}

export function FileTree({
  data,
  onSelect,
  selectedId,
}: {
  data: FsNode[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 240, h: 600 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#252526]">
      <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-[#cccccc]/70">
        Explorer
      </div>
      <div className="px-4 pb-1 text-[11px] font-bold text-[#cccccc]">
        IDE-DEMO
      </div>
      <div ref={wrapRef} className="flex-1 min-h-0">
        <Tree
          data={data}
          openByDefault
          width={size.w}
          height={size.h}
          indent={14}
          rowHeight={22}
          paddingTop={4}
          paddingBottom={8}
          selection={selectedId ?? undefined}
          onSelect={(nodes) => {
            const n = nodes[0];
            if (n && !n.data.children) onSelect(n.id);
          }}
        >
          {Node}
        </Tree>
      </div>
    </div>
  );
}
