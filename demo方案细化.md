# Atoms Demo 方案细化

## 一、题目核心解读

### 要做什么
实现一个**类 Atoms 的 AI Agent 驱动应用生成平台**：用户用自然语言描述需求 → AI 生成可运行代码 → 以网页形式实时展示。

### 题目明确说了什么
- **不考察"用 Atoms 做 Atoms"**，关注你如何借助 AI 工具快速把想法变成可运行原型
- 必须有**真实交互**（不是静态页面）
- 必须有**数据持久化**
- 覆盖**基本使用流程**（初始化/注册/核心主流程）
- 至少一个**延展能力**
- 需提供**在线可访问链接 + GitHub 源码**
- 建议附**说明文档**（实现思路、取舍、完成程度、扩展方向）

### 评估维度
| 维度 | 他们看什么 |
|------|-----------|
| 完成度 | 功能完整、稳定、基本工程质量 |
| 工程思维 | 任务拆解、技术选型、复杂度控制与取舍 |
| 用户体验 | 交互清晰、流程顺畅、是否"可用" |
| 创新性 | 亮点设计、独特视角、可扩展潜力 |
| 可交付性 | 文档清晰、可运行、整体完成质量 |

---

## 二、Atoms 产品分析（从官网提炼）

Atoms 的核心卖点：
- **多 Agent 协作**：Deep Researcher → Product Manager → Architect → Engineer → Team Leader，模拟一个完整团队
- **一句话生成应用**：用户描述想法，AI 全流程生成
- **实时预览 + 可视化编辑器**：生成的应用可以直接看到和操作
- **全栈能力**：用户登录、数据库、支付等开箱即用
- **可导出代码**：同步到 GitHub

**你的 Demo 要复刻的核心体验**：描述需求 → AI 生成 → 实时预览 → 持久化保存

---

## 三、技术选型与理由

### 技术栈

| 层级 | 选择 | 理由 |
|------|------|------|
| 框架 | **Next.js 14 (App Router)** | 全栈一体，API Routes 免去单独后端；Vercel 一键部署；题目要求在线链接 |
| 样式 | **Tailwind CSS + shadcn/ui** | 快速出好看 UI；与 Next.js 生态完美配合 |
| AI 接口 | **Claude API** (或 OpenAI) | 流式输出提升体验；代码生成能力强 |
| 数据库 | **SQLite + Prisma** | 零配置、单文件、部署简单；满足"数据持久化"要求 |
| 代码预览 | **iframe srcdoc** | 最简方案，安全沙箱内渲染用户生成的 HTML/CSS/JS |
| 部署 | **Vercel** | 免费额度充足；Next.js 原生支持；自动 HTTPS |

### 为什么不选其他方案
- **不用 Python/FastAPI 后端**：多一个服务要部署，8小时内增加复杂度
- **不用 PostgreSQL**：需要外部数据库服务，增加部署复杂度；SQLite 对 Demo 足够
- **不用 WebContainer/CodeSandbox API**：过度工程化，沙箱 iframe 已满足需求

---

## 四、功能设计与优先级

### P0 - 必须完成（约 5 小时）

**1. 项目管理（基本使用流程）**
- 创建新项目（输入项目名称和描述）
- 项目列表页（查看所有项目）
- 进入项目工作区

**2. AI 对话生成（核心主流程）**
- 聊天式交互：用户输入自然语言描述
- 调用 LLM API 生成 HTML/CSS/JS 代码
- 流式输出（SSE），实时显示 AI 回复
- 生成的代码在右侧 iframe 中实时渲染

**3. 实时预览（真实交互）**
- iframe 沙箱渲染生成的应用
- 支持查看生成代码的源码
- 预览区可交互（生成的表单能填、按钮能点）

**4. 数据持久化**
- 项目信息持久化（名称、描述、创建时间）
- 对话历史持久化（每轮对话内容）
- 生成的代码持久化（关联到项目）

### P1 - 加分项（约 2 小时，至少做 1 个）

**5. 多轮迭代优化（推荐）**
- 用户可以对生成的应用提修改意见
- AI 基于上一版代码进行增量修改
- 支持查看历史版本

**6. 模板市场**
- 预置 3-5 个常见应用模板（Todo App、Landing Page、Dashboard）
- 一键使用模板作为起点
- 模板可搜索

**7. 代码编辑器**
- 生成后用户可以手动微调代码
- 代码高亮显示
- 编辑后实时刷新预览

### P2 - 如果时间充裕

**8. 多 Agent 角色模拟**（最有亮点）
- 模拟 Atoms 的多 Agent 协作：PM → Architect → Engineer
- 每个阶段有明确输出（需求文档 → 技术方案 → 代码）
- 用户可以在每个阶段审批/修改
- **这个最有创新性，但实现成本高，看时间是否允许**

---

## 五、UI 布局设计

### 整体布局
```
┌─────────────────────────────────────────────────────┐
│  Logo   项目名称              [导出代码] [部署] [设置] │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│   对话区          │         预览区                    │
│                  │                                  │
│  ┌────────────┐  │   ┌──────────────────────────┐   │
│  │ AI: 我来帮  │  │   │                          │   │
│  │ 你创建...  │  │   │   生成的应用实时渲染       │   │
│  └────────────┘  │   │                          │   │
│                  │   │   (iframe sandbox)        │   │
│  ┌────────────┐  │   │                          │   │
│  │ User: 帮我 │  │   │                          │   │
│  │ 做一个...  │  │   │                          │   │
│  └────────────┘  │   │                          │   │
│                  │   └──────────────────────────┘   │
│  ┌────────────┐  │                                  │
│  │ 输入框      │  │   [预览] [代码] [历史版本]        │
│  └────────────┘  │                                  │
├──────────────────┴──────────────────────────────────┤
│  状态栏：模型 | Token用量 | 生成时间                   │
└─────────────────────────────────────────────────────┘
```

### 首页/项目列表
```
┌─────────────────────────────────────────────────────┐
│  Logo    Atoms Demo              [新建项目]           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ 项目1    │  │ 项目2    │  │ 项目3    │             │
│  │ Todo App │  │ Dashboard│ │ Landing  │             │
│  │ 3天前    │  │ 1周前    │  │ 2周前    │             │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 六、数据库设计

```prisma
// schema.prisma

model Project {
  id          String   @id @default(cuid())
  name        String
  description String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  messages    Message[]
  snapshots   Snapshot[]
}

model Message {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  role      String   // "user" | "assistant" | "system"
  content   String
  createdAt DateTime @default(now())
}

model Snapshot {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  code      String   // 生成的 HTML/CSS/JS 代码
  version   Int      // 版本号
  createdAt DateTime @default(now())
}
```

---

## 七、核心 API 设计

```
POST   /api/projects              创建项目
GET    /api/projects              获取项目列表
GET    /api/projects/[id]         获取项目详情
DELETE /api/projects/[id]         删除项目

POST   /api/projects/[id]/chat    发送对话（触发 AI 生成）
GET    /api/projects/[id]/messages 获取对话历史

GET    /api/projects/[id]/snapshot 获取最新快照
GET    /api/projects/[id]/snapshots 获取历史快照
```

### 聊天 API 核心逻辑（/api/projects/[id]/chat）

```
1. 接收用户消息
2. 加载该项目历史对话上下文
3. 构造 System Prompt：
   - 你是一个全栈工程师 AI Agent
   - 用户会描述想要的应用
   - 你需要生成完整的 HTML（内联 CSS + JS）
   - 代码必须是一个自包含的 HTML 文件
   - 返回格式：在 <code> 标签中返回代码
4. 调用 LLM API（流式）
5. 流式返回给前端
6. 完成后：提取代码 → 保存为 Snapshot → 更新预览
```

### System Prompt 设计（关键）

```
你是一个专业的全栈工程师 AI Agent，类似于 Atoms 平台的核心引擎。

用户会用自然语言描述他们想要的网页应用。你需要：

1. 分析用户需求
2. 生成一个完整的、自包含的 HTML 文件（包含内联 CSS 和 JavaScript）
3. 代码要求：
   - 使用现代 CSS（flexbox/grid）实现响应式布局
   - 使用 vanilla JavaScript 实现交互逻辑
   - 所有功能必须在单个 HTML 文件中完成
   - UI 美观，符合现代设计风格
   - 代码注释清晰

返回格式：将完整代码放在 ```html ``` 代码块中。
在代码块之前，简要说明你的实现思路。
```

---

## 八、时间分配（8小时）

| 时段 | 任务 | 产出 |
|------|------|------|
| **0:00-0:30** | 项目初始化 | Next.js 项目、Tailwind 配置、shadcn/ui 安装、Prisma + SQLite 配置 |
| **0:30-1:30** | 数据层 + API | Prisma schema、迁移、所有 API routes 实现完成 |
| **1:30-2:30** | 首页 + 项目管理 | 项目列表页、新建项目、删除项目 |
| **2:30-4:00** | 工作区核心 | 聊天 UI + LLM 集成（流式输出） + iframe 预览 |
| **4:00-5:00** | 数据持久化串联 | 对话历史加载、代码快照保存、刷新不丢数据 |
| **5:00-6:30** | P1 功能 | 多轮迭代优化 + 代码查看/编辑 Tab |
| **6:30-7:30** | UI 打磨 + 部署 | 样式优化、Loading 状态、错误处理、Vercel 部署 |
| **7:30-8:00** | 文档 + 提交 | README、说明文档、GitHub push、给 HR 发链接 |

---

## 九、Vibe Coding 工作流（用 AI 工具做 Demo）

既然题目鼓励用 AI 工具，最大化利用：

### 推荐工具链
- **Claude Code**（CLI）：脚手架生成、API 开发、调试
- **Cursor**：UI 组件开发、样式调整
- **Claude API**：作为 Demo 的 AI 后端

### 用 Claude Code 的策略
```bash
# 第一步：生成项目骨架
claude "创建一个 Next.js 14 项目，使用 App Router、Tailwind CSS、shadcn/ui、Prisma + SQLite"

# 第二步：生成数据库和 API
claude "根据以下 Prisma schema 生成迁移，并创建所有 CRUD API routes..."

# 第三步：逐页面生成 UI
claude "创建工作区页面，左侧聊天面板右侧 iframe 预览..."

# 第四步：集成 AI
claude "实现 /api/chat 路由，使用流式调用 Claude API..."
```

### 关键：不要让 AI 一次生成整个项目
- 分步、分模块给 prompt
- 每步生成后先验证可运行，再继续
- 保持对代码的理解，面试时会被问到

---

## 十、亮点设计（拉开差距的点）

### 必做亮点
1. **流式输出 + 实时预览**：AI 生成代码时，iframe 实时更新，不是等全部生成完才显示。这个体验感很强。
2. **多轮迭代**：不是一次性生成，而是能对话式优化。这是 Atoms 的核心体验。
3. **项目版本快照**：每次生成保存一个版本，可以回退。展示工程思维。

### 如果能做到的杀手级亮点
4. **多 Agent 模拟**：在对话中体现 PM → Engineer 的角色切换。例如：
   - 第一轮：PM Agent 输出需求摘要让用户确认
   - 第二轮：Engineer Agent 根据确认的需求生成代码
   - 这完美契合 Atoms 的多 Agent 理念，评审一定会注意到

5. **生成应用的真实可用性**：不要只生成展示页面，让它生成一个真正能交互的 Todo App / 计算器等，评审可以直接操作验证

---

## 十一、README / 说明文档模板

提交时附的说明文档建议包含：

```markdown
# Atoms Demo

## 实现思路
一句话概述：复刻 Atoms 的核心体验——AI Agent 驱动的应用生成平台

## 技术选型与取舍
- Next.js 全栈：省去独立后端部署
- SQLite：零配置持久化，Demo 场景足够
- iframe srcdoc：最简沙箱方案
- 取舍说明：为什么没用 XX（展示思考过程）

## 功能完成度
- ✅ 项目创建/管理
- ✅ AI 对话式生成
- ✅ 实时预览
- ✅ 数据持久化
- ✅ 多轮迭代
- ⬜ 多 Agent 协作（时间不足，见下方扩展方向）

## 扩展方向
如果继续投入时间，我会按以下优先级扩展：
1. P0: 多 Agent 角色（PM/Architect/Engineer）
2. P1: 用户认证 + 多租户
3. P2: 生成 React/Vue 组件而非纯 HTML
4. P3: 一键部署生成物到独立域名

## 本地运行
\```bash
npm install
npx prisma migrate dev
npm run dev
# 访问 http://localhost:3000
\```

## AI 工具使用
- Claude Code：项目脚手架、API 开发
- Cursor：UI 组件开发
- 账单：xx$/月
```

---

## 十二、部署检查清单

- [ ] Vercel 部署成功，在线链接可访问
- [ ] GitHub 仓库 public，README 完整
- [ ] 首次打开能正常创建项目
- [ ] 对话生成流程完整可用
- [ ] 刷新页面数据不丢失
- [ ] 移动端基本可用（响应式）
- [ ] 无 console 报错
- [ ] 环境变量（API Key）不在代码中暴露
- [ ] .env.example 文件提供模板
- [ ] 说明文档附在 Google Docs 副本末尾

---

## 十三、风险与应对

| 风险 | 应对 |
|------|------|
| Claude API 额度不够 | 准备 OpenAI API 作为备选；或用更便宜的 Haiku 模型 |
| 8小时做不完 P1 | P0 功能必须完整，P1 宁缺毋滥，部分完成不如不做 |
| 生成的代码质量差 | 优化 System Prompt，增加 few-shot 示例 |
| iframe 安全问题 | 使用 sandbox 属性限制权限 |
| 部署失败 | 提前 1 小时开始部署，留出调试时间 |
