export type FsNode = {
  id: string;
  name: string;
  children?: FsNode[];
  content?: string;
  language?: string;
};

export const initialTree: FsNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      {
        id: "src/app",
        name: "app",
        children: [
          {
            id: "src/app/page.tsx",
            name: "page.tsx",
            language: "typescript",
            content: `export default function Page() {
  return (
    <main className="grid place-items-center h-screen">
      <h1 className="text-4xl font-bold">Hello, world.</h1>
    </main>
  );
}
`,
          },
          {
            id: "src/app/layout.tsx",
            name: "layout.tsx",
            language: "typescript",
            content: `import "./globals.css";

export const metadata = {
  title: "definitely a real app",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
`,
          },
        ],
      },
      {
        id: "src/components",
        name: "components",
        children: [
          {
            id: "src/components/Button.tsx",
            name: "Button.tsx",
            language: "typescript",
            content: `type Props = {
  onClick?: () => void;
  children: React.ReactNode;
};

export function Button({ onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
    >
      {children}
    </button>
  );
}
`,
          },
        ],
      },
      {
        id: "src/utils.ts",
        name: "utils.ts",
        language: "typescript",
        content: `export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
`,
      },
    ],
  },
  {
    id: "public",
    name: "public",
    children: [
      {
        id: "public/robots.txt",
        name: "robots.txt",
        language: "plaintext",
        content: `User-agent: *
Disallow:
`,
      },
    ],
  },
  {
    id: "package.json",
    name: "package.json",
    language: "json",
    content: `{
  "name": "ide-demo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  }
}
`,
  },
  {
    id: "tsconfig.json",
    name: "tsconfig.json",
    language: "json",
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "jsx": "preserve",
    "moduleResolution": "bundler"
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
`,
  },
  {
    id: "README.md",
    name: "README.md",
    language: "markdown",
    content: `# ide-demo

코드 에디터처럼 생겼습니다. 사실은 관찰 장치입니다.
당신이 어떻게 코딩하는지 — 정확히는 어떻게 *못* 코딩하는지 — 가 콘텐츠입니다.

다섯 개의 도전이 있습니다. 다섯 번 모두 무언가 일어납니다.
좋은 일은 아닙니다.

---

## 🎮 도전 1 — 첫 인사

아무 탭에서나 키를 한 번 눌러보세요.
환영 인사가 뜹니다. 격려는 아닙니다.

---

## ⚡ 도전 2 — 손이 머리를 추월하기

1초에 22자 이상으로 쳐 보세요.
빠른 게 잘하는 거였다면 이 도전은 없었을 겁니다.

---

## 🔙 도전 3 — 후회의 미학

백스페이스를 1초에 5번 이상, 혹은 2초 이상 꾹.
지운 만큼 무언가 살아납니다. 안타깝게도 자막이 살아납니다.

---

## 🧘 도전 4 — 응시

한 번이라도 친 뒤, 30초간 아무것도 하지 마세요.
응시는 사고가 아닙니다. 그걸 알려주는 건 보통 친구가 아닙니다.

---

## 🔁 도전 5 — 무한루프

Esc · Enter · Space 중 하나를 1초에 5번 이상.
시도가 해결인 줄 아는 사람은, 같은 자리를 정성껏 지킵니다.

---

## 🫵 한 가지 더

요즘은 다들 에이전트한테 시키죠. 편하니까요. 그래서 심심합니다.
이 IDE는 *당신이* 치는 걸 보려고 만들었습니다.
손이 머리를 추월하는 순간은 위임이 안 됩니다.
에이전트한테는 손이 없거든요.

직접 치세요.
`,
  },
  {
    id: ".gitignore",
    name: ".gitignore",
    language: "plaintext",
    content: `node_modules
.next
.env*
`,
  },
];

const STORAGE_KEY = "ide-demo:overrides:v1";
const ADDED_KEY = "ide-demo:added:v1";

export type Overrides = Record<string, string>;

export type AddedNode = {
  id: string;
  parentId: string | null; // null → 루트
  name: string;
  isFolder: boolean;
  language?: string;
};

export function loadOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveOverride(id: string, content: string) {
  if (typeof window === "undefined") return;
  const current = loadOverrides();
  current[id] = content;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function loadAdditions(): AddedNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(ADDED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAddition(node: AddedNode) {
  if (typeof window === "undefined") return;
  const current = loadAdditions();
  current.push(node);
  window.sessionStorage.setItem(ADDED_KEY, JSON.stringify(current));
}

// 저장된 AddedNode 목록을 tree에 합성. parentId 기준으로 해당 폴더의 자식으로 삽입.
// 폴더 addition이 중첩된 경우(폴더 만들고 그 안에 파일 만들기)도 재귀로 처리.
export function applyAdditions(
  tree: FsNode[],
  additions: AddedNode[]
): FsNode[] {
  if (additions.length === 0) return tree;

  const byParent = new Map<string | null, AddedNode[]>();
  for (const a of additions) {
    const arr = byParent.get(a.parentId) ?? [];
    arr.push(a);
    byParent.set(a.parentId, arr);
  }

  function toFsNode(a: AddedNode): FsNode {
    if (a.isFolder) {
      return { id: a.id, name: a.name, children: walk([], a.id) };
    }
    return {
      id: a.id,
      name: a.name,
      language: a.language ?? languageFromName(a.name),
      content: "",
    };
  }

  function walk(nodes: FsNode[], parentId: string | null): FsNode[] {
    const mapped = nodes.map((n) =>
      n.children ? { ...n, children: walk(n.children, n.id) } : n
    );
    const toAddHere = byParent.get(parentId) ?? [];
    if (toAddHere.length === 0) return mapped;
    return [...mapped, ...toAddHere.map(toFsNode)];
  }

  return walk(tree, null);
}

export function applyOverrides(tree: FsNode[], overrides: Overrides): FsNode[] {
  return tree.map((node) => {
    if (node.children) {
      return { ...node, children: applyOverrides(node.children, overrides) };
    }
    if (overrides[node.id] !== undefined) {
      return { ...node, content: overrides[node.id] };
    }
    return node;
  });
}

export function findNode(tree: FsNode[], id: string): FsNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

export function getParentId(id: string): string | null {
  const idx = id.lastIndexOf("/");
  return idx === -1 ? null : id.slice(0, idx);
}

export function getSiblings(tree: FsNode[], id: string, max = 5): string[] {
  const parentId = getParentId(id);
  const pool = parentId ? findNode(tree, parentId)?.children : tree;
  if (!pool) return [];
  const out: string[] = [];
  for (const n of pool) {
    if (n.id === id) continue;
    if (n.children) continue;
    out.push(n.name);
    if (out.length >= max) break;
  }
  return out;
}

export function languageFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "html":
      return "html";
    case "py":
      return "python";
    default:
      return "plaintext";
  }
}
