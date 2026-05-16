# Atoms Demo

AI Agent 驱动的应用生成平台 —— 复刻 [Atoms](https://atoms.dev/) 的核心体验。

用户通过自然语言对话描述需求，AI 实时生成可运行的网页应用，并以可视化方式展示。

## 实现思路

核心理念：**稳定优先**，将 P0 功能做到极致稳定和流畅。

用户流程：注册/登录 → 创建项目 → 对话式生成代码 → 实时预览 → 多轮迭代优化 → 版本管理

## 技术选型与取舍

| 层级 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 16 (App Router) | 全栈一体，API Routes 免去独立后端 |
| 样式 | Tailwind CSS + shadcn/ui | 快速出美观 UI |
| AI | 硅基流动 API (GLM-4-32B) | 成本可控，OpenAI 兼容格式 |
| 数据库 | Vercel Postgres (Neon) | Serverless PostgreSQL，与 Atoms 同款 |
| ORM | Prisma 7 | 类型安全，自动生成 Client |
| 认证 | JWT + bcrypt | 简单可靠，满足"注册/登录"要求 |
| 预览 | iframe srcdoc | 安全沙箱，零额外依赖 |

**为什么不选其他方案：**
- 不用 Python 后端：多一个服务要部署，增加复杂度
- 不用 Clerk/NextAuth：Demo 不需要 OAuth，自实现更轻量
- 不用 WebContainer：过度工程化，iframe 已满足需求

## 功能完成度

- ✅ 用户注册/登录（JWT 认证）
- ✅ 项目创建、列表、删除
- ✅ AI 对话式代码生成（流式输出）
- ✅ 实时预览（iframe 沙箱渲染）
- ✅ 代码查看（语法高亮）
- ✅ 多轮迭代（基于上版代码增量修改）
- ✅ 历史版本管理（查看/回退）
- ✅ 数据持久化（项目、对话、代码快照）

## 扩展方向

如果继续投入时间，按以下优先级扩展：

1. **多 Agent 角色模拟**：PM Agent → Engineer Agent 的角色切换，最契合 Atoms 理念
2. **用户认证增强**：OAuth 登录、多租户隔离
3. **生成 React 组件**：架构已预留扩展，可接入 WebContainer 支持 React
4. **模板市场**：预置常见应用模板，一键使用
5. **一键部署**：将生成的应用部署到独立域名

## 本地运行

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入真实值

# 数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串（Neon） |
| `SILICONFLOW_API_KEY` | 硅基流动 API Key |
| `JWT_SECRET` | JWT 签名密钥 |

## AI 工具使用

本项目使用以下 AI 工具辅助开发：
- Claude Code (CLI)：项目架构设计、API 开发、调试
- 账单：$100/月
