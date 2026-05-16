# Atoms Demo 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个类 Atoms 的 AI Agent 驱动应用生成平台，用户通过自然语言对话生成可运行的网页应用。

**Architecture:** Next.js 14 全栈应用，App Router 提供 API Routes 和页面。前端使用 Tailwind + shadcn/ui 组件库。AI 通过硅基流动 API（OpenAI 兼容格式）接入 GLM-5.1 模型。数据持久化使用 Vercel Postgres (Neon) + Prisma ORM。认证采用自实现 JWT 方案。生成的应用通过 iframe srcdoc 安全沙箱渲染。

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Vercel Postgres (Neon), 硅基流动 API (GLM-5.1), JWT + bcrypt

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `prisma/schema.prisma`
- Create: `.env.example`, `.env.local`, `.gitignore`

**Step 1: 创建 Next.js 项目**

```bash
cd E:/js
npx create-next-app@latest atoms-demo --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd atoms-demo
```

**Step 2: 安装核心依赖**

```bash
npm install prisma @prisma/client
npm install bcryptjs jsonwebtoken
npm install @types/bcryptjs @types/jsonwebtoken --save-dev
```

**Step 3: 初始化 Prisma**

```bash
npx prisma init
```

**Step 4: 配置 .env.example**

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
SILICONFLOW_API_KEY="your-api-key-here"
JWT_SECRET="your-jwt-secret-here"
```

**Step 5: 复制为 .env.local 并填入真实值**

```bash
cp .env.example .env.local
```

**Step 6: 创建 .gitignore 追加项**

确保 `.gitignore` 包含：
```
.env.local
.env
node_modules/
.prisma/
```

**Step 7: 验证项目能启动**

```bash
npm run dev
```

Expected: 浏览器访问 `http://localhost:3000` 看到 Next.js 默认页面

**Step 8: 初始化 git 并首次提交**

```bash
cd E:/js/atoms-demo
git init
git add .
git commit -m "feat: initialize Next.js project with Prisma and dependencies"
```

---

## Task 2: 数据库 Schema 与 Prisma 配置

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

**Step 1: 编写 Prisma Schema**

替换 `prisma/schema.prisma` 全部内容：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String    @id @default(cuid())
  username  String    @unique
  password  String
  createdAt DateTime  @default(now())
  projects  Project[]
}

model Project {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String    @default("")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  messages    Message[]
  snapshots   Snapshot[]
}

model Message {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  role      String
  content   String
  createdAt DateTime @default(now())
}

model Snapshot {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  code      String
  version   Int
  createdAt DateTime @default(now())
}
```

**Step 2: 创建 Prisma Client 单例**

创建 `src/lib/prisma.ts`：

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 3: 运行数据库迁移**

```bash
npx prisma migrate dev --name init
```

Expected: 迁移成功，生成 Prisma Client

**Step 4: 验证 Prisma Client 生成**

```bash
npx prisma generate
```

Expected: `prisma generate` 输出成功信息

**Step 5: 提交**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: add Prisma schema with User, Project, Message, Snapshot models"
```

---

## Task 3: JWT 认证工具函数

**Files:**
- Create: `src/lib/auth.ts`

**Step 1: 编写认证工具函数**

创建 `src/lib/auth.ts`：

```typescript
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export function signToken(payload: { userId: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<{ userId: string; username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
```

**Step 2: 提交**

```bash
git add src/lib/auth.ts
git commit -m "feat: add JWT auth utility functions"
```

---

## Task 4: 认证 API 路由

**Files:**
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`

**Step 1: 创建注册路由**

创建 `src/app/api/auth/register/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "用户名长度需在 2-20 个字符之间" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "密码长度至少 4 个字符" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });

    const token = signToken({ userId: user.id, username: user.username });

    const response = NextResponse.json({
      user: { id: user.id, username: user.username },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
```

**Step 2: 创建登录路由**

创建 `src/app/api/auth/login/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const token = signToken({ userId: user.id, username: user.username });

    const response = NextResponse.json({
      user: { id: user.id, username: user.username },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
```

**Step 3: 创建登出路由**

创建 `src/app/api/auth/logout/route.ts`：

```typescript
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", "", { maxAge: 0 });
  return response;
}
```

**Step 4: 提交**

```bash
git add src/app/api/auth/
git commit -m "feat: add register, login, logout API routes"
```

---

## Task 5: 安装 shadcn/ui 组件

**Files:**
- Modify: `components.json`, `src/lib/utils.ts`
- Create: 各 UI 组件文件（通过 CLI 生成）

**Step 1: 初始化 shadcn/ui**

```bash
npx shadcn@latest init
```

选择：
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 2: 安装需要的组件**

```bash
npx shadcn@latest add button input card label toast sonner tabs textarea dialog
```

**Step 3: 提交**

```bash
git add .
git commit -m "feat: initialize shadcn/ui and install core components"
```

---

## Task 6: 登录/注册页面

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/layout.tsx`

**Step 1: 创建认证布局**

创建 `src/app/(auth)/layout.tsx`：

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {children}
    </div>
  );
}
```

**Step 2: 创建登录/注册页面**

创建 `src/app/(auth)/login/page.tsx`：

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }

      router.push("/projects");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Atoms Demo</CardTitle>
        <CardDescription>
          {isLogin ? "登录你的账户" : "创建新账户"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "处理中..." : isLogin ? "登录" : "注册"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "没有账户？" : "已有账户？"}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-primary hover:underline ml-1"
            >
              {isLogin ? "注册" : "登录"}
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 3: 验证登录页可访问**

```bash
npm run dev
```

访问 `http://localhost:3000/login`，确认表单正常渲染

**Step 4: 提交**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add login/register page with auth layout"
```

---

## Task 7: 首页重定向逻辑

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: 替换首页为重定向逻辑**

替换 `src/app/page.tsx`：

```tsx
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/projects");
  } else {
    redirect("/login");
  }
}
```

**Step 2: 提交**

```bash
git add src/app/page.tsx
git commit -m "feat: add root redirect based on auth state"
```

---

## Task 8: 项目 API 路由

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`

**Step 1: 创建项目列表/创建路由**

创建 `src/app/api/projects/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true, snapshots: true } },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { name, description } = await request.json();

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: "项目名称不能为空" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || "",
      userId: user.userId,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
```

**Step 2: 创建项目详情/删除路由**

创建 `src/app/api/projects/[id]/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project || project.userId !== user.userId) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
```

**Step 3: 提交**

```bash
git add src/app/api/projects/
git commit -m "feat: add project CRUD API routes with auth guard"
```

---

## Task 9: 项目列表页面

**Files:**
- Create: `src/app/(main)/projects/page.tsx`
- Create: `src/app/(main)/layout.tsx`

**Step 1: 创建主布局**

创建 `src/app/(main)/layout.tsx`：

```tsx
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

async function logout() {
  "use server";
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("token", "", { maxAge: 0 });
  redirect("/login");
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <a href="/projects" className="text-lg font-bold">
            Atoms Demo
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.username}
            </span>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                退出登录
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

**Step 2: 创建项目列表页**

创建 `src/app/(main)/projects/page.tsx`：

```tsx
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { DeleteProjectButton } from "./delete-button";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: user.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true, snapshots: true } },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">我的项目</h1>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">还没有项目，创建一个吧</p>
          <Link href="/projects/new">
            <Button>创建第一个项目</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="group relative">
              <Link href={`/projects/${project.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{project._count.messages} 条对话</span>
                    <span>{project._count.snapshots} 个版本</span>
                    <span>{project.updatedAt.toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Link>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <DeleteProjectButton projectId={project.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: 创建删除按钮组件**

创建 `src/app/(main)/projects/delete-button.tsx`：

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("确定要删除这个项目吗？")) return;

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
```

**Step 4: 提交**

```bash
git add src/app/\(main\)/
git commit -m "feat: add project list page with create and delete"
```

---

## Task 10: 新建项目页面

**Files:**
- Create: `src/app/(main)/projects/new/page.tsx`

**Step 1: 创建新建项目页面**

创建 `src/app/(main)/projects/new/page.tsx`：

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/projects/${data.project.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>新建项目</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">项目名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Todo App"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">项目描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述你想构建的应用..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "创建中..." : "创建项目"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/app/\(main\)/projects/new/
git commit -m "feat: add new project creation page"
```

---

## Task 11: 聊天 API（核心 - LLM 集成）

**Files:**
- Create: `src/lib/ai.ts`
- Create: `src/app/api/projects/[id]/chat/route.ts`
- Create: `src/app/api/projects/[id]/messages/route.ts`
- Create: `src/app/api/projects/[id]/snapshots/route.ts`

**Step 1: 创建 AI 工具函数**

创建 `src/lib/ai.ts`：

```typescript
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const API_BASE = "https://api.siliconflow.cn/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `你是一个专业的全栈工程师 AI Agent，类似于 Atoms 平台的核心引擎。

用户会用自然语言描述他们想要的网页应用。你需要：

1. 分析用户需求
2. 生成一个完整的、自包含的 HTML 文件（包含内联 CSS 和 JavaScript）
3. 代码要求：
   - 使用现代 CSS（flexbox/grid）实现美观的响应式布局
   - 使用 vanilla JavaScript 实现所有交互逻辑
   - 所有功能必须在单个 HTML 文件中完成
   - UI 要现代美观，配色专业
   - 不使用 alert/prompt/confirm，用内联提示代替

返回格式：将完整代码放在 \`\`\`html \`\`\` 代码块中。
在代码块之前，用 1-2 句话简要说明你的实现思路。`;

export function buildMessages(
  history: ChatMessage[],
  userMessage: string,
  previousCode?: string
): ChatMessage[] {
  let systemPrompt = SYSTEM_PROMPT;

  if (previousCode) {
    systemPrompt += `

当前已有上一版代码，用户正在对已有应用提出修改需求。请基于上一版代码进行增量修改，不要从头重写。`;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
  ];

  if (previousCode) {
    messages.push({
      role: "user",
      content: `[上一版代码]\n${previousCode}\n\n[修改要求]\n${userMessage}`,
    });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  return messages;
}

export async function streamChat(messages: ChatMessage[]) {
  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: "THUDM/GLM-4-32B-0414",
      messages,
      stream: true,
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  return response;
}

export function extractCode(text: string): string | null {
  const match = text.match(/```html\s*([\s\S]*?)```/);
  if (match) return match[1].trim();

  // Fallback: try to find HTML tag
  const htmlMatch = text.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (htmlMatch) return htmlMatch[1].trim();

  return null;
}
```

**Step 2: 创建聊天 API 路由（流式）**

创建 `src/app/api/projects/[id]/chat/route.ts`：

```typescript
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMessages, streamChat, extractCode } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project || project.userId !== user.userId) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const { message } = await request.json();

  // Save user message
  await prisma.message.create({
    data: { projectId: id, role: "user", content: message },
  });

  // Load history
  const history = await prisma.message.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // Load latest snapshot
  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { projectId: id },
    orderBy: { version: "desc" },
  });

  const chatHistory = history
    .filter((m) => m.role !== "user" || m.content !== message)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const messages = buildMessages(
    chatHistory,
    message,
    latestSnapshot?.code
  );

  try {
    const aiResponse = await streamChat(messages);

    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (!trimmed.startsWith("data: ")) continue;

              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(new TextEncoder().encode(delta));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }

          // Save assistant message
          await prisma.message.create({
            data: { projectId: id, role: "assistant", content: fullContent },
          });

          // Extract and save snapshot if code found
          const code = extractCode(fullContent);
          if (code) {
            const version = (latestSnapshot?.version || 0) + 1;
            await prisma.snapshot.create({
              data: { projectId: id, code, version },
            });
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "AI 服务暂时不可用" },
      { status: 500 }
    );
  }
}
```

**Step 3: 创建对话历史 API**

创建 `src/app/api/projects/[id]/messages/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project || project.userId !== user.userId) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}
```

**Step 4: 创建快照 API**

创建 `src/app/api/projects/[id]/snapshots/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project || project.userId !== user.userId) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const snapshots = await prisma.snapshot.findMany({
    where: { projectId: id },
    orderBy: { version: "desc" },
  });

  return NextResponse.json({ snapshots });
}
```

**Step 5: 提交**

```bash
git add src/lib/ai.ts src/app/api/projects/
git commit -m "feat: add chat API with LLM streaming, messages and snapshots"
```

---

## Task 12: 工作区页面（核心 UI）

**Files:**
- Create: `src/app/(main)/projects/[id]/page.tsx`
- Create: `src/components/chat-panel.tsx`
- Create: `src/components/preview-panel.tsx`
- Create: `src/components/code-viewer.tsx`

**Step 1: 创建聊天面板组件**

创建 `src/components/chat-panel.tsx`：

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatPanelProps {
  projectId: string;
  initialMessages: Message[];
  onCodeGenerated?: (code: string) => void;
}

export function ChatPanel({
  projectId,
  initialMessages,
  onCodeGenerated,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setInput("");

    const optimisticMsg: Message = {
      id: "temp-" + Date.now(),
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setStreaming(true);
    setStreamContent("");

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error("请求失败");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamContent(fullContent);
      }

      const assistantMsg: Message = {
        id: "temp-assistant-" + Date.now(),
        role: "assistant",
        content: fullContent,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStreamContent("");

      // Try to extract code and notify parent
      const codeMatch = fullContent.match(/```html\s*([\s\S]*?)```/);
      if (codeMatch && onCodeGenerated) {
        onCodeGenerated(codeMatch[1].trim());
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Date.now(),
          role: "assistant",
          content: "抱歉，生成过程中出现了错误，请重试。",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-2">描述你想构建的应用</p>
            <p className="text-sm">例如：帮我做一个待办事项应用</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streaming && streamContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-4 py-2 text-sm bg-muted whitespace-pre-wrap">
              {streamContent}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="描述你想构建的应用..."
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={2}
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
          >
            {streaming ? "生成中..." : "发送"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: 创建预览面板组件**

创建 `src/components/preview-panel.tsx`：

```tsx
"use client";

interface PreviewPanelProps {
  code: string | null;
}

export function PreviewPanel({ code }: PreviewPanelProps) {
  if (!code) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="mb-2">应用预览区</p>
          <p className="text-sm">发送消息生成应用后，将在此处显示</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={code}
      sandbox="allow-scripts allow-forms allow-modals"
      className="w-full h-full border-0 bg-white"
      title="应用预览"
    />
  );
}
```

**Step 3: 创建代码查看器组件**

创建 `src/components/code-viewer.tsx`：

```tsx
"use client";

interface CodeViewerProps {
  code: string;
}

export function CodeViewer({ code }: CodeViewerProps) {
  return (
    <div className="h-full overflow-auto">
      <pre className="p-4 text-sm font-mono bg-slate-950 text-slate-50 min-h-full">
        <code>{code}</code>
      </pre>
    </div>
  );
}
```

**Step 4: 创建工作区页面**

创建 `src/app/(main)/projects/[id]/page.tsx`：

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { PreviewPanel } from "@/components/preview-panel";
import { CodeViewer } from "@/components/code-viewer";
import { Button } from "@/components/ui/button";

type Tab = "preview" | "code" | "history";

interface Snapshot {
  id: string;
  code: string;
  version: number;
  createdAt: string;
}

export default function WorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [messages, setMessages] = useState([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(
    null
  );
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    async function loadData() {
      const [msgRes, snapRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/messages`),
        fetch(`/api/projects/${projectId}/snapshots`),
      ]);

      if (msgRes.ok) {
        const data = await msgRes.json();
        setMessages(data.messages);
      }

      if (snapRes.ok) {
        const data = await snapRes.json();
        setSnapshots(data.snapshots);
        if (data.snapshots.length > 0) {
          setCurrentCode(data.snapshots[0].code);
        }
      }
    }

    loadData();
  }, [projectId]);

  function handleCodeGenerated(code: string) {
    setCurrentCode(code);
    setActiveTab("preview");
    // Refresh snapshots
    fetch(`/api/projects/${projectId}/snapshots`)
      .then((res) => res.json())
      .then((data) => {
        if (data.snapshots) {
          setSnapshots(data.snapshots);
        }
      });
  }

  const displayCode = selectedSnapshot?.code || currentCode;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex-1 flex">
        {/* Left: Chat Panel */}
        <div className="w-[400px] border-r flex flex-col">
          <div className="p-3 border-b bg-muted/30">
            <h2 className="text-sm font-medium truncate">{projectName || "工作区"}</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              projectId={projectId}
              initialMessages={messages}
              onCodeGenerated={handleCodeGenerated}
            />
          </div>
        </div>

        {/* Right: Preview/Code/History */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center border-b px-4">
            <Button
              variant={activeTab === "preview" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("preview")}
            >
              预览
            </Button>
            <Button
              variant={activeTab === "code" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("code")}
            >
              代码
            </Button>
            <Button
              variant={activeTab === "history" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("history")}
            >
              历史版本 ({snapshots.length})
            </Button>
          </div>

          <div className="flex-1">
            {activeTab === "preview" && (
              <PreviewPanel code={displayCode} />
            )}
            {activeTab === "code" && displayCode && (
              <CodeViewer code={displayCode} />
            )}
            {activeTab === "code" && !displayCode && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                暂无代码
              </div>
            )}
            {activeTab === "history" && (
              <div className="p-4 space-y-2">
                {snapshots.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    暂无历史版本
                  </p>
                ) : (
                  snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      onClick={() => {
                        setSelectedSnapshot(snap);
                        setCurrentCode(snap.code);
                        setActiveTab("preview");
                      }}
                      className={`w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                        selectedSnapshot?.id === snap.id
                          ? "border-primary bg-muted"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          版本 {snap.version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(snap.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: 提交**

```bash
git add src/components/ src/app/\(main\)/projects/\[id\]/
git commit -m "feat: add workspace page with chat, preview, code viewer and history"
```

---

## Task 13: 安装 lucide-react 图标库

**Step 1: 安装依赖**

```bash
npm install lucide-react
```

**Step 2: 提交**

```bash
git add package.json package-lock.json
git commit -m "feat: add lucide-react for icons"
```

---

## Task 14: 端到端测试与修复

**Step 1: 启动开发服务器**

```bash
npm run dev
```

**Step 2: 测试注册/登录流程**

1. 访问 `http://localhost:3000` → 应重定向到 `/login`
2. 注册新用户（输入用户名和密码）
3. 注册成功后应重定向到 `/projects`

**Step 3: 测试项目创建**

1. 点击"新建项目"
2. 输入名称和描述
3. 点击"创建项目" → 应跳转到工作区

**Step 4: 测试聊天生成**

1. 在输入框输入："帮我做一个简单的计算器应用"
2. 点击发送
3. 观察 AI 流式回复
4. 确认右侧 iframe 显示生成的计算器
5. 测试计算器是否能正常操作

**Step 5: 测试多轮迭代**

1. 继续输入："给计算器加一个清除按钮"
2. 观察 AI 基于上版代码修改
3. 确认预览更新

**Step 6: 测试历史版本**

1. 点击"历史版本" Tab
2. 确认有多个版本
3. 点击旧版本，确认预览切换

**Step 7: 测试数据持久化**

1. 刷新页面
2. 确认对话历史和预览内容不丢失

**Step 8: 修复发现的问题**

记录并修复测试中发现的所有问题，然后提交：

```bash
git add .
git commit -m "fix: address issues found during end-to-end testing"
```

---

## Task 15: UI 打磨与错误处理

**Files:**
- Modify: 各组件文件（添加 loading 状态、错误提示、响应式优化）

**Step 1: 添加全局 Toaster**

确保 `src/app/layout.tsx` 包含 `<Toaster />`：

```tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Step 2: 添加 loading 状态**

在各页面添加 `loading.tsx`：

创建 `src/app/(main)/projects/loading.tsx`：

```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
      <div className="animate-pulse text-muted-foreground">加载中...</div>
    </div>
  );
}
```

**Step 3: 添加 404 页面**

创建 `src/app/not-found.tsx`：

```tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-4">页面不存在</p>
        <Link href="/projects">
          <Button>返回首页</Button>
        </Link>
      </div>
    </div>
  );
}
```

**Step 4: 响应式优化**

确保工作区在小屏幕上可用：
- 聊天面板和预览面板在小屏上改为上下布局
- 项目列表卡片自适应列数

**Step 5: 提交**

```bash
git add .
git commit -m "feat: add loading states, 404 page, and responsive improvements"
```

---

## Task 16: 部署与文档

**Step 1: 创建 README.md**

创建项目根目录的 `README.md`，包含：
- 项目简介
- 技术选型与取舍说明
- 功能完成度清单
- 本地运行说明
- 扩展方向

**Step 2: 创建 .env.example**

确保 `.env.example` 存在且不包含真实密钥：

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
SILICONFLOW_API_KEY="your-api-key-here"
JWT_SECRET="your-jwt-secret-here"
```

**Step 3: 检查代码中无硬编码密钥**

```bash
grep -r "sk-" src/ --include="*.ts" --include="*.tsx"
grep -r "password" src/ --include="*.ts" --include="*.tsx" | grep -v "const password" | grep -v "type=\"password\""
```

Expected: 无输出（没有泄露的密钥）

**Step 4: Vercel 部署**

```bash
npm install -g vercel
vercel
```

配置环境变量：
- `DATABASE_URL`
- `SILICONFLOW_API_KEY`
- `JWT_SECRET`

**Step 5: 部署后验证**

访问部署链接，重复 Task 14 的测试步骤，确认线上版本正常工作。

**Step 6: 最终提交**

```bash
git add .
git commit -m "docs: add README and deployment configuration"
```

**Step 7: 推送到 GitHub**

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```
