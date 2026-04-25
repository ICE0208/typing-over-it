"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { loader, type OnMount } from "@monaco-editor/react";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full grid place-items-center text-[#858585] text-[12px]">
      Loading editor...
    </div>
  ),
});

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs",
  },
});

export function EditorPane({
  path,
  value,
  language,
  onChange,
  onSave,
}: {
  path: string;
  value: string;
  language: string;
  onChange: (v: string) => void;
  onSave?: () => void;
}) {
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    loader.init();
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => onSaveRef.current?.()
    );
  };

  return (
    <Editor
      height="100%"
      path={path}
      defaultLanguage={language}
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        fontFamily: "var(--font-geist-mono), Menlo, Consolas, monospace",
        fontSize: 13,
        fontLigatures: true,
        minimap: { enabled: true },
        tabSize: 2,
        insertSpaces: true,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        renderWhitespace: "selection",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12 },
      }}
    />
  );
}
