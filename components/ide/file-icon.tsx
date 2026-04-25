"use client";

import { Icon, addCollection } from "@iconify/react";
import { memo, useEffect, useState } from "react";

// Material Icon Theme (VSCode 플러그인과 동일 소스)을 Iconify로 사용.
// 891KB JSON을 초기 번들에 포함하지 않도록 클라이언트에서 동적으로 1회만 로드.
let loadPromise: Promise<void> | null = null;
function ensureCollection(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = import("@iconify-json/material-icon-theme/icons.json").then(
    (mod) => {
      // JSON 모듈은 default 또는 namespace로 제공될 수 있음
      const data = (mod as unknown as { default?: unknown }).default ?? mod;
      addCollection(data as Parameters<typeof addCollection>[0]);
    }
  );
  return loadPromise;
}

// 파일명(+확장자) / 폴더명 → Material Icon Theme 아이콘 키 매핑.
// 존재하지 않는 키를 반환하면 Iconify가 공백으로 렌더하므로, 확실히 존재하는 것만.

// 확장자 → 아이콘
const EXT_ICON: Record<string, string> = {
  ts: "typescript",
  tsx: "react-ts",
  js: "javascript",
  jsx: "react",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  mdx: "mdx",
  css: "css",
  scss: "sass",
  sass: "sass",
  html: "html",
  htm: "html",
  svg: "svg",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  ico: "image",
  py: "python",
  go: "go",
  rs: "rust",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  lock: "lock",
  sh: "console",
  bash: "console",
  zsh: "console",
  ps1: "powershell",
  txt: "document",
  env: "tune",
};

// 전체 파일명 → 아이콘 (확장자보다 우선)
const FILENAME_ICON: Record<string, string> = {
  "package.json": "nodejs",
  "package-lock.json": "nodejs",
  "pnpm-lock.yaml": "nodejs",
  "yarn.lock": "nodejs",
  "tsconfig.json": "tsconfig",
  "tsconfig.base.json": "tsconfig",
  "tsconfig.build.json": "tsconfig",
  "jsconfig.json": "tsconfig",
  "next.config.ts": "next",
  "next.config.js": "next",
  "next.config.mjs": "next",
  "tailwind.config.ts": "tailwindcss",
  "tailwind.config.js": "tailwindcss",
  "postcss.config.ts": "postcss",
  "postcss.config.js": "postcss",
  "postcss.config.mjs": "postcss",
  "eslint.config.mjs": "eslint",
  "eslint.config.js": "eslint",
  "eslint.config.ts": "eslint",
  ".eslintrc": "eslint",
  ".eslintrc.json": "eslint",
  ".eslintrc.js": "eslint",
  ".prettierrc": "prettier",
  ".prettierrc.json": "prettier",
  "prettier.config.js": "prettier",
  "vite.config.ts": "vite",
  "vite.config.js": "vite",
  "README.md": "readme",
  "readme.md": "readme",
  "README": "readme",
  ".gitignore": "git",
  ".gitattributes": "git",
  "Dockerfile": "docker",
  "docker-compose.yml": "docker",
  "docker-compose.yaml": "docker",
  "Makefile": "makefile",
};

// 폴더명 → Material Icon Theme 폴더 아이콘. 미스매치는 folder-other로.
const FOLDER_ICON: Record<string, string> = {
  src: "folder-src",
  app: "folder-app",
  pages: "folder-views",
  components: "folder-components",
  public: "folder-public",
  lib: "folder-lib",
  utils: "folder-utils",
  hooks: "folder-hook",
  styles: "folder-css",
  css: "folder-css",
  assets: "folder-resource",
  resources: "folder-resource",
  api: "folder-api",
  config: "folder-config",
  docs: "folder-docs",
  doc: "folder-docs",
  node_modules: "folder-node",
  ".git": "folder-git",
  ".github": "folder-git",
  test: "folder-test",
  tests: "folder-test",
  __tests__: "folder-test",
  dist: "folder-dist",
  build: "folder-dist",
  environment: "folder-environment",
  environments: "folder-environment",
};

function resolveIcon(name: string, isFolder: boolean, isOpen: boolean): string {
  if (isFolder) {
    const base = FOLDER_ICON[name] ?? "folder-other";
    return isOpen ? `${base}-open` : base;
  }
  const byName = FILENAME_ICON[name];
  if (byName) return byName;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_ICON[ext] ?? "document";
}

type Props = {
  name: string;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: number;
  className?: string;
};

// React.memo로 감싸서 부모가 무관한 사유로 재렌더할 때 SVG 재생성 비용을 차단.
// 같은 (name, isFolder, isOpen, size, className) 조합이면 이전 SVG 그대로 유지.
export const FileIcon = memo(function FileIcon({
  name,
  isFolder = false,
  isOpen = false,
  size = 16,
  className,
}: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    ensureCollection().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const iconName = resolveIcon(name, isFolder, isOpen);

  // 로드 전에는 같은 크기 자리를 잡아둬서 레이아웃 점프 방지
  if (!ready) {
    return (
      <span
        className={className}
        style={{ display: "inline-block", width: size, height: size }}
      />
    );
  }

  return (
    <Icon
      icon={`material-icon-theme:${iconName}`}
      width={size}
      height={size}
      className={className}
    />
  );
});
