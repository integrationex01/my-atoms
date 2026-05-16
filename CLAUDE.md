# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Atoms Demo** — An AI-agent-driven web app generation platform. Users describe apps in natural language, and an LLM generates self-contained HTML applications in real-time via streaming chat. Built with Next.js 16 (App Router), React 19, Prisma 7, and shadcn/ui (base-nova style). UI language is Chinese (zh-CN).

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals + typescript configs)
npx prisma migrate dev    # Run schema migrations
npx prisma generate       # Regenerate Prisma client
npx prisma studio         # Database GUI
npx shadcn@latest add <component>  # Add shadcn/ui component
```

## Environment

Required in `.env` (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `SILICONFLOW_API_KEY` — API key for SiliconFlow LLM service
- `JWT_SECRET` — Secret for JWT token signing

## Architecture

### Route Groups

- `src/app/(auth)/` — Auth pages (login). No auth guard; public layout with dark gradient background.
- `src/app/(main)/` — Protected pages. `layout.tsx` checks auth via `getCurrentUser()` and redirects to `/login` if unauthenticated. Includes header with user info and logout.
- `src/app/page.tsx` — Root redirector: authenticated users → `/projects`, unauthenticated → `/login`.

### API Routes

All under `src/app/api/`:

| Route | Methods | Purpose |
|---|---|---|
| `auth/register` | POST | Create user, set JWT cookie |
| `auth/login` | POST | Validate credentials, set JWT cookie |
| `auth/logout` | POST | Clear JWT cookie |
| `projects` | GET, POST | List/create user's projects |
| `projects/[id]` | DELETE | Delete a project (cascades) |
| `projects/[id]/chat` | POST | Stream LLM response, save message + snapshot |
| `projects/[id]/messages` | GET | Get all messages for a project |
| `projects/[id]/snapshots` | GET | Get versioned code snapshots |

Auth is cookie-based JWT (`httpOnly`, `sameSite: lax`, 7-day expiry). Every protected API route calls `getCurrentUser()` from `@/lib/auth` which reads the token from cookies.

### AI Integration (`src/lib/ai.ts`)

- Uses SiliconFlow API (`api.siliconflow.cn/v1`) with `THUDM/GLM-4-32B-0414` model
- System prompt instructs the LLM to generate single self-contained HTML files with inline CSS/JS
- Supports incremental editing: when a previous snapshot exists, the prompt includes prior code and asks for modifications only
- Chat history is windowed to last 10 messages
- `extractCode()` parses the LLM response for `` ```html ``` `` blocks or full HTML documents

### Workspace UI (`src/app/(main)/projects/[id]/page.tsx`)

Split-panel layout: left side is `ChatPanel`, right side has tabs for Preview (iframe srcDoc), Code viewer, and Snapshot history. All client-side state management with `useState`/`useEffect`.

### Data Model (Prisma)

```
User → Project → Message
                 Snapshot (versioned code snapshots)
```

- Prisma client is generated to `src/generated/prisma` (configured in `prisma.config.ts` and `schema.prisma`)
- Uses `@prisma/adapter-pg` (PostgreSQL adapter) with connection string from `DATABASE_URL`
- Singleton pattern in `src/lib/prisma.ts` to avoid hot-reload connection leaks

### Path Aliases

`@/*` maps to `./src/*` (TypeScript and Next.js). shadcn/ui components live in `@/components/ui/`.

## Key Conventions

- **使用中文进行所有交流和回复**
- **开发环境为 Windows**，文件路径分隔符使用正斜杠 `/`，shell 命令使用 Unix 风格（bash）
- Next.js 16 params: route handlers receive `{ params }: { params: Promise<{ id: string }> }` — params must be awaited
- API error responses use Chinese-language messages (matching the UI language)
- UI components use shadcn/ui (base-nova style) with Tailwind v4 and `tw-animate-css`
- Server actions use `"use server"` directive (see logout in main layout)
