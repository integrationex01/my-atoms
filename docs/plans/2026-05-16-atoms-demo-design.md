# Atoms Demo 设计文档

## 一、项目定位

实现一个类 Atoms 的 AI Agent 驱动应用生成平台。核心体验：用户用自然语言描述需求 → AI 生成可运行代码 → 以网页形式实时展示。

方案策略：**极致稳定**——P0 功能做到零 bug、体验流畅，不追求功能数量。

---

## 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | 全栈一体，API Routes 内置 |
| 样式 | Tailwind CSS + shadcn/ui | 快速出美观 UI |
| AI | 硅基流动 API (GLM-5.1) | OpenAI 兼容格式，流式输出 |
| 数据库 | Vercel Postgres (Neon) | Serverless PostgreSQL，Prisma ORM |
| 认证 | 自实现 JWT | users 表 + bcrypt 密码哈希 |
| 预览 | iframe srcdoc | 安全沙箱渲染生成代码 |
| 部署 | Vercel | 一键部署，自动 HTTPS |

---

## 三、数据库设计

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

---

## 四、页面与路由

```
/ (首页)           → 未登录：登录/注册页
                   → 已登录：项目列表页

/projects/new      → 新建项目
/projects/[id]     → 工作区（核心页面）
```

### 用户流程

1. 打开网站 → 登录/注册页
2. 注册（用户名+密码）或登录 → 进入项目列表
3. 点击"新建项目" → 输入名称和描述 → 创建
4. 进入工作区 → 左侧聊天，右侧预览
5. 输入需求 → AI 流式生成代码 → 右侧实时预览
6. 继续对话 → AI 基于上版代码增量修改
7. 查看代码源码、切换历史版本

---

## 五、API 设计

```
认证:
POST   /api/auth/register     注册
POST   /api/auth/login        登录

项目:
GET    /api/projects           当前用户项目列表
POST   /api/projects           创建项目
DELETE /api/projects/[id]      删除项目

工作区:
POST   /api/projects/[id]/chat     发送对话（流式返回）
GET    /api/projects/[id]/messages  对话历史
GET    /api/projects/[id]/snapshots 历史快照
```

### 聊天 API 核心逻辑

1. 验证用户身份 + 项目归属
2. 接收用户消息，存入 Message 表（role: "user"）
3. 加载该项目历史对话上下文
4. 加载最新 Snapshot 代码（如果有）
5. 构造 System Prompt（含上版代码则做增量修改）
6. 调用硅基流动 API（OpenAI 兼容格式，stream: true）
7. 流式返回给前端
8. 流结束后：提取代码 → 保存 Snapshot → 存 assistant 消息

---

## 六、System Prompt

```
你是一个专业的全栈工程师 AI Agent，类似于 Atoms 平台的核心引擎。

用户会用自然语言描述他们想要的网页应用。你需要：

1. 分析用户需求
2. 生成一个完整的、自包含的 HTML 文件（包含内联 CSS 和 JavaScript）
3. 代码要求：
   - 使用现代 CSS（flexbox/grid）实现美观的响应式布局
   - 使用 vanilla JavaScript 实现所有交互逻辑
   - 所有功能必须在单个 HTML 文件中完成
   - UI 要现代美观，配色专业
   - 不使用 alert/prompt/confirm，用内联提示代替

[如果存在上一版代码]
4. 用户正在对已有应用提出修改需求：
   - 上一版代码：{previous_code}
   - 修改要求：{user_message}
   - 请基于上一版代码进行增量修改，不要从头重写

返回格式：将完整代码放在 ```html ``` 代码块中。
在代码块之前，用 1-2 句话简要说明你的实现思路。
```

---

## 七、功能清单

| 功能 | 说明 |
|------|------|
| 注册/登录 | 用户名+密码，JWT 鉴权 |
| 项目 CRUD | 创建、查看列表、删除项目 |
| 聊天式代码生成 | 输入需求，AI 流式生成代码 |
| 实时预览 | iframe 渲染生成的 HTML |
| 代码查看 | 查看生成的源码，带语法高亮 |
| 多轮迭代 | 基于上版代码增量修改 |
| 历史版本 | 查看/回退到之前的代码快照 |
| 数据持久化 | 项目、对话、代码全部持久化 |

---

## 八、错误处理

| 场景 | 处理方式 |
|------|---------|
| LLM 返回格式异常 | 提示用户重试，正则兜底提取 |
| API 调用失败/超时 | 友好错误提示 |
| JWT 过期 | 前端检测 401，跳转登录页 |
| 项目不存在 | 404 页面 |
| 网络断开 | Toast 提示 |

---

## 九、部署

- 本地开发：`.env.local` 存 `DATABASE_URL` 和 `SILICONFLOW_API_KEY`
- Vercel 部署：Dashboard 配置环境变量
- Vercel Postgres：通过 Vercel 集成创建
- `.env.example` 提供模板，不泄露真实密钥

---

## 十、时间分配（6-7 小时）

| 时段 | 任务 |
|------|------|
| 0:00-0:45 | 项目初始化 + Prisma + 数据库迁移 |
| 0:45-1:30 | 认证系统（注册/登录/JWT 中间件） |
| 1:30-2:30 | 项目 CRUD + 项目列表页 UI |
| 2:30-4:30 | 工作区核心（聊天 UI + LLM 流式集成 + iframe 预览） |
| 4:30-5:30 | 数据持久化串联 + 多轮迭代 + 历史版本 |
| 5:30-6:30 | UI 打磨 + 错误处理 + 边界情况 |
| 6:30-7:00 | 部署 + 文档 + 提交 |
