# TaskFlow — Claude Code Guide

## 项目概述

TaskFlow 是一个**实时协作看板（Kanban）应用**，采用全栈 TypeScript monorepo 架构，支持多人实时协作、拖拽排序、WebSocket 广播更新。

## 技术栈

| 层级 | 技术 |
|------|------|
| Backend 框架 | Hono 4.0 |
| 数据库 | PostgreSQL 16 + Prisma ORM |
| 实时通信 | Socket.io 4.7 |
| 认证 | JWT + bcryptjs |
| Frontend 框架 | React 18 + Vite 5 |
| 服务端状态 | TanStack Query 5 |
| 客户端状态 | Zustand 4 |
| 样式 | Tailwind CSS 3.4 |
| 拖拽 | dnd-kit 6 |
| 包管理器 | pnpm workspaces |
| 运行时 | Node.js 20 |

## Monorepo 结构

```
taskflow/
├── apps/
│   ├── backend/          # Hono REST API + Socket.io 服务
│   │   ├── src/
│   │   │   ├── index.ts          # 服务入口，挂载路由和 Socket.io
│   │   │   ├── middleware/auth.ts # JWT 鉴权中间件
│   │   │   ├── routes/           # auth, boards, columns, cards
│   │   │   └── lib/              # prisma, jwt, socket, position, access, activity
│   │   └── prisma/
│   │       ├── schema.prisma     # 数据库 Schema
│   │       └── seed.ts           # 种子数据
│   └── frontend/         # React SPA
│       ├── src/
│       │   ├── api/              # Axios 封装（auth, boards, cards）
│       │   ├── components/       # board/, auth/, ui/
│       │   ├── pages/            # BoardsPage, BoardPage
│       │   ├── store/            # Zustand stores（auth, board）
│       │   └── hooks/            # 自定义 React hooks
│       ├── vite.config.ts        # 开发代理配置
│       └── nginx.conf            # 生产环境静态服务
└── packages/
    └── shared/           # 跨前后端共享的 TypeScript 类型定义
```

## 开发命令

### 快速启动（推荐 Docker）

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- PostgreSQL: localhost:5433

### 本地开发

```bash
# 安装所有依赖
pnpm install

# 先构建共享包（其他包依赖它）
pnpm --filter @taskflow/shared build

# 数据库迁移
pnpm --filter @taskflow/backend db:migrate

# 种子数据（可选）
pnpm --filter @taskflow/backend db:seed

# 启动 Backend（端口 4000）
pnpm --filter @taskflow/backend dev

# 启动 Frontend（端口 5173）
pnpm --filter @taskflow/frontend dev
```

### 其他常用命令

```bash
# 类型检查
pnpm --filter @taskflow/backend typecheck
pnpm --filter @taskflow/frontend typecheck

# 构建
pnpm --filter @taskflow/backend build
pnpm --filter @taskflow/frontend build

# Lint
pnpm --filter @taskflow/frontend lint

# Prisma Studio（可视化数据库）
pnpm --filter @taskflow/backend db:studio
```

## 环境变量

参考 `.env.example`：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥 |
| `PORT` | Backend 监听端口（默认 4000） |
| `FRONTEND_URL` | 前端 URL，用于 CORS 和 Socket.io origin |
| `VITE_API_URL` | 前端调用的 API base URL |
| `VITE_WS_URL` | 前端 WebSocket 连接地址 |

## 数据库 Schema

6 张主要表：

- **users** — 用户账号（email, name, password hash）
- **boards** — 看板
- **board_members** — 看板成员及角色（owner / member）
- **columns** — 看板列（含 fractional index 排序位置）
- **cards** — 卡片（含 fractional index 排序位置）
- **activity_logs** — 操作审计日志

列和卡片均在 `(boardId, position)` 上建有复合索引，确保排序查询高效。

## 关键架构决策

### Fractional Indexing 排序

列和卡片的排序位置使用字符串（如 `"a0"`、`"a0V"`、`"a1"`），由 `fractional-indexing` 库生成。在两个元素之间插入新元素时，只需计算中间值，无需更新其他行，实现 O(1) 插入。

实现位置：`apps/backend/src/lib/position.ts`

### 乐观更新 + 回滚

拖拽卡片时：
1. Zustand store 立即更新 UI（乐观更新）
2. 后台发送 `PATCH /api/cards/:id/move`
3. 失败时从快照回滚，显示 toast 通知

实现位置：`apps/frontend/src/store/board.ts`

### Socket.io 实时广播

每个看板对应一个 Socket.io 房间（`board:{boardId}`）。任何写操作完成后，Backend 向该房间广播事件，所有连接的客户端实时更新。

服务端事件：`card:created`、`card:moved`、`column:reordered`、`member:invited` 等。

实现位置：`apps/backend/src/lib/socket.ts`

## API 约定

所有接口返回统一结构：

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

鉴权接口需在请求头中携带：`Authorization: Bearer <token>`

主要路由前缀：`/api/auth`、`/api/boards`、`/api/columns`、`/api/cards`
