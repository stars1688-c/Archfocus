# ArchFocus MVP 技术架构与实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成 ArchFocus Phase 1 MVP 开发——React 前端 + 基础 API + TikOmni 数据对接，为 Phase 2 AI 能力（LangGraph 编排）奠定基础。

**架构：** 基于 PRD 第 5-6 章的 AI 架构设计，Phase 1 MVP 专注于构建可用的核心产品，暂时搁置 LangGraph AI 编排层。Phase 1 末将产出可运行的 MVP，Phase 2 再接入 AI 能力。

**技术栈：**

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **前端框架** | React 18 + TypeScript | 组件化、TypeScript 类型安全 |
| **状态管理** | Zustand | 轻量级，比 Redux 简单 |
| **路由** | React Router v6 | SPA 路由 |
| **UI 组件库** | Tailwind CSS + Radix UI | 快速样式开发 + 无障碍组件 |
| **HTTP 客户端** | Axios + React Query | 请求管理与缓存 |
| **后端 runtime** | Next.js 14 (App Router) | API Routes + 服务端能力 |
| **数据库** | SQLite (开发) / PostgreSQL (生产) | Prisma ORM |
| **数据源** | TikOmni API | 笔记数据同步 |
| **AI 能力** | **Phase 2 规划** | MiniMax/Kimi/DeepSeek + LangGraph |

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      ArchFocus MVP                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────────────────────────┐ │
│  │   React SPA  │────▶│       Next.js API Routes          │ │
│  │  (Frontend)  │     │                                  │ │
│  └──────────────┘     │  /api/auth      - 认证           │ │
│         │              │  /api/accounts  - 账号管理        │ │
│         │              │  /api/notes     - 笔记 CRUD       │ │
│         │              │  /api/analytics - 数据分析        │ │
│         │              │  /api/sync      - TikOmni 同步    │ │
│         │              └─────────────┬────────────────────┘ │
│         │                            │                      │
│  ┌──────▼──────┐              ┌──────▼──────┐               │
│  │  Zustand    │              │   SQLite    │               │
│  │  (State)    │              │  (Local DB) │               │
│  └─────────────┘              └─────────────┘               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              TikOmni API (External)                   │   │
│  │  - 笔记数据同步                                         │   │
│  │  - 点赞/评论/收藏/转发数据                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Phase 2 扩展点（不包含在 MVP 内）：
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph AI 编排层                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 文案生成 │  │ 去AI位   │  │ 配图生成 │  │ 质量判断 │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └──────────────┴──────────────┴──────────────┘         │
│                          │                                   │
│               ┌──────────▼──────────┐                        │
│               │  MiniMax/Kimi/DeepSeek │                      │
│               │  Image 2.0 / Seedream │                      │
│               └───────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 文件结构

```
archfocus/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # 侧边栏布局
│   │   │   ├── page.tsx         # 工作台
│   │   │   ├── create/
│   │   │   │   └── page.tsx     # 创作向导
│   │   │   ├── drafts/
│   │   │   │   └── page.tsx     # 笔记库
│   │   │   └── analytics/
│   │   │       └── page.tsx     # 数据分析
│   │   └── api/
│   │       ├── auth/
│   │       │   └── route.ts
│   │       ├── accounts/
│   │       │   └── route.ts
│   │       ├── notes/
│   │       │   └── route.ts
│   │       └── sync/
│   │           └── route.ts
│   ├── components/
│   │   ├── ui/                   # Radix UI 基础组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── dashboard/
│   │   │   ├── stat-card.tsx
│   │   │   └── account-card.tsx
│   │   ├── create/
│   │   │   ├── wizard-steps.tsx
│   │   │   ├── topic-step.tsx
│   │   │   ├── content-step.tsx
│   │   │   ├── image-step.tsx
│   │   │   └── publish-step.tsx
│   │   ├── drafts/
│   │   │   ├── note-card.tsx
│   │   │   └── note-detail-modal.tsx
│   │   └── analytics/
│   │       ├── filter-bar.tsx
│   │       ├── data-table.tsx
│   │       └── export-button.tsx
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-accounts.ts
│   │   ├── use-notes.ts
│   │   └── use-sync.ts
│   ├── stores/
│   │   ├── auth-store.ts
│   │   ├── account-store.ts
│   │   └── ui-store.ts
│   ├── lib/
│   │   ├── api.ts               # Axios 配置
│   │   ├── prisma.ts            # Prisma client
│   │   └── tiktokomni.ts        # TikOmni API 客户端
│   └── types/
│       └── index.ts             # TypeScript 类型定义
├── prisma/
│   └── schema.prisma            # 数据模型
├── public/
│   └── prototype/               # 复用原型中的静态资源
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 数据模型（基于 PRD 4.1-4.2）

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  phone     String   @unique
  password  String   // bcrypt hash
  name      String?
  createdAt DateTime @default(now())
  accounts  Account[]
}

model Account {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String
  xiaohongshuId String?
  email       String?
  phone       String?
  position    String   // 账号定位
  audience    String   // 目标受众
  description String   // 人设描述 (max 1000)
  status      String   @default("active") // active | pending
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  notes       Note[]
}

model Note {
  id          String   @id @default(cuid())
  accountId   String
  account     Account  @relation(fields: [accountId], references: [id])
  title       String
  content     String
  images      String   // JSON array of image URLs
  likes       Int      @default(0)
  comments    Int      @default(0)
  bookmarks   Int      @default(0)
  shares      Int      @default(0)
  status      String   @default("pending") // pending | published
  publishAt   DateTime? // 定时发布时间
  publishedAt DateTime?
  xiaohongshuUrl String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SyncConfig {
  id            String @id @default(cuid())
  intervalDays  Int    @default(1)
  syncTime      String @default("02:00") // HH:mm
  lastSyncAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 任务分解

### 任务 1：项目初始化

**文件：**
- 创建：`package.json`
- 创建：`tsconfig.json`
- 创建：`tailwind.config.ts`
- 创建：`next.config.js`
- 创建：`prisma/schema.prisma`
- 创建：`.env.example`

- [ ] **步骤 1：创建 package.json**

```json
{
  "name": "archfocus",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.14.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-switch": "^1.0.3",
    "zustand": "^4.5.0",
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.28.0",
    "react-router-dom": "^6.22.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "prisma": "^5.14.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.2.0"
  }
}
```

- [ ] **步骤 2：创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **步骤 3：创建 tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e8455c',
          light: '#ff6b81',
          bg: '#fff0f2',
        },
        accent: {
          blue: '#2d9cdb',
          green: '#27ae60',
          orange: '#f2994a',
        },
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **步骤 4：创建 prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  phone     String    @unique
  password  String
  name      String?
  createdAt DateTime  @default(now())
  accounts  Account[]
}

model Account {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  name          String
  xiaohongshuId String?
  email         String?
  phone         String?
  position      String
  audience      String
  description   String
  status        String   @default("active")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  notes         Note[]
}

model Note {
  id            String    @id @default(cuid())
  accountId     String
  account       Account   @relation(fields: [accountId], references: [id])
  title         String
  content        String
  images        String    @default("[]")
  likes         Int       @default(0)
  comments      Int       @default(0)
  bookmarks     Int       @default(0)
  shares        Int       @default(0)
  status        String    @default("pending")
  publishAt     DateTime?
  publishedAt   DateTime?
  xiaohongshuUrl String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model SyncConfig {
  id           String    @id @default(cuid())
  intervalDays Int       @default(1)
  syncTime     String    @default("02:00")
  lastSyncAt   DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

- [ ] **步骤 5：创建 .env.example**

```bash
# Database
DATABASE_URL="file:./dev.db"

# Auth
JWT_SECRET="your-super-secret-key-change-in-production"

# TikOmni API
TIKOMNI_API_KEY="your-tiktokomni-api-key"
TIKOMNI_API_URL="https://api.tiktokomni.com"

# Optional: Email for reminders
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

- [ ] **步骤 6：初始化项目并安装依赖**

运行：`npm install && npx prisma generate && npx prisma db push`

预期：依赖安装成功，Prisma Client 生成，SQLite 数据库创建

- [ ] **步骤 7：Commit**

```bash
git add package.json tsconfig.json tailwind.config.ts next.config.js prisma/schema.prisma .env.example
git commit -m "chore: initialize Next.js project with TypeScript and Prisma"
```

---

### 任务 2：类型定义与 API 客户端

**文件：**
- 创建：`src/types/index.ts`
- 创建：`src/lib/api.ts`
- 创建：`src/lib/prisma.ts`
- 创建：`src/lib/tiktokomni.ts`

- [ ] **步骤 1：创建 TypeScript 类型定义**

```typescript
// src/types/index.ts

export interface User {
  id: string
  phone: string
  name?: string
  createdAt: Date
}

export interface Account {
  id: string
  userId: string
  name: string
  xiaohongshuId?: string
  email?: string
  phone?: string
  position: string
  audience: string
  description: string
  status: 'active' | 'pending'
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  accountId: string
  title: string
  content: string
  images: string[]
  likes: number
  comments: number
  bookmarks: number
  shares: number
  status: 'pending' | 'published'
  publishAt?: Date
  publishedAt?: Date
  xiaohongshuUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface SyncConfig {
  id: string
  intervalDays: number
  syncTime: string
  lastSyncAt?: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Analytics types
export interface NoteAnalytics {
  id: string
  title: string
  content: string
  images: string[]
  likes: number
  comments: number
  bookmarks: number
  shares: number
  publishedAt: Date
  xiaohongshuUrl?: string
}

export interface AnalyticsFilter {
  startDate?: string
  endDate?: string
  likesMin?: number
  likesMax?: number
  bookmarksMin?: number
  bookmarksMax?: number
  commentsMin?: number
  commentsMax?: number
  accountId?: string
}

export type SortField = 'publishedAt' | 'likes' | 'comments' | 'bookmarks' | 'shares'
export type SortDirection = 'asc' | 'desc'
```

- [ ] **步骤 2：创建 Prisma Client 实例**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **步骤 3：创建 API 客户端**

```typescript
// src/lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **步骤 4：创建 TikOmni API 客户端**

```typescript
// src/lib/tiktokomni.ts
import axios from 'axios'

const tiktokomniApi = axios.create({
  baseURL: process.env.TIKOMNI_API_URL || 'https://api.tiktokomni.com',
  headers: {
    'Authorization': `Bearer ${process.env.TIKOMNI_API_KEY}`,
    'Content-Type': 'application/json',
  },
})

export interface TikOmniNote {
  note_id: string
  title: string
  content: string
  images: string[]
  likes: number
  comments: number
  bookmarks: number
  shares: number
  published_at: string
  url: string
}

export interface TikOmniSyncResult {
  success: boolean
  notes: TikOmniNote[]
  syncedAt: string
}

// 获取小红书账号的笔记数据
export async function fetchNotes(accountId: string, xiaohongshuId: string): Promise<TikOmniSyncResult> {
  const response = await tiktokomniApi.post('/sync/notes', {
    account_id: accountId,
    xiaohongshu_id: xiaohongshuId,
  })
  return response.data
}

// 手动触发同步
export async function triggerSync(accountIds: string[]): Promise<TikOmniSyncResult[]> {
  const response = await tiktokomniApi.post('/sync/trigger', {
    account_ids: accountIds,
  })
  return response.data
}
```

- [ ] **步骤 5：Commit**

```bash
git add src/types/index.ts src/lib/api.ts src/lib/prisma.ts src/lib/tiktokomni.ts
git commit -m "feat: add TypeScript types and API clients"
```

---

### 任务 3：UI 组件库

**文件：**
- 创建：`src/lib/utils.ts`
- 创建：`src/components/ui/button.tsx`
- 创建：`src/components/ui/input.tsx`
- 创建：`src/components/ui/select.tsx`
- 创建：`src/components/ui/modal.tsx`
- 创建：`src/components/ui/tabs.tsx`
- 创建：`src/components/ui/badge.tsx`
- 创建：`src/components/ui/card.tsx`

- [ ] **步骤 1：创建工具函数**

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
```

- [ ] **步骤 2：创建 Button 组件**

```typescript
// src/components/ui/button.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-light',
      outline: 'border border-gray-200 bg-transparent text-gray-700 hover:border-primary hover:text-primary',
      ghost: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700',
      danger: 'border border-primary text-primary hover:bg-primary hover:text-white',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2 text-sm',
      lg: 'px-7 py-3 text-base',
    }
    
    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
```

- [ ] **步骤 3：创建 Input 组件**

```typescript
// src/components/ui/input.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-500 mb-1.5">
            {label}
          </label>
        )}
        <input
          className={cn(
            'w-full px-3.5 py-2 border border-gray-200 rounded-lg outline-none transition-all',
            'focus:border-primary focus:ring-2 focus:ring-primary/10',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **步骤 4：创建 Select 组件（基于 Radix UI）**

```typescript
// src/components/ui/select.tsx
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between border border-gray-200 bg-white px-3 py-2 text-sm rounded-lg',
      'outline-none focus:border-primary focus:ring-2 focus:ring-primary/10',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <span className="text-gray-400">▼</span>
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center py-1.5 px-2 text-sm rounded-md',
      'outline-none hover:bg-gray-100 focus:bg-gray-100',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }
```

- [ ] **步骤 5：创建 Modal 组件（基于 Radix UI Dialog）**

```typescript
// src/components/ui/modal.tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

const Modal = DialogPrimitive.Root
const ModalTrigger = DialogPrimitive.Trigger
const ModalClose = DialogPrimitive.Close

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto',
        'bg-white rounded-xl shadow-xl animate-in fade-in zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
ModalContent.displayName = DialogPrimitive.Content.displayName

const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between px-5 py-4 border-b border-gray-100', className)} {...props} />
)
ModalHeader.displayName = 'ModalHeader'

const ModalBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-4', className)} {...props} />
)
ModalBody.displayName = 'ModalBody'

const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-3 px-5 py-4 border-t border-gray-100', className)} {...props} />
)
ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalTrigger, ModalClose, ModalContent, ModalHeader, ModalBody, ModalFooter }
```

- [ ] **步骤 6：创建 Tabs 组件**

```typescript
// src/components/ui/tabs.tsx
import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex items-center border-b border-gray-200', className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'px-4 py-2.5 text-sm font-medium text-gray-500 border-b-2 border-transparent -mb-px',
      'hover:text-gray-700 transition-colors',
      'data-[state=active]:text-primary data-[state=active]:border-primary',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('pt-4 outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [ ] **步骤 7：创建 Badge 组件**

```typescript
// src/components/ui/badge.tsx
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'red' | 'blue' | 'green' | 'orange' | 'purple'
}

export function Badge({ className, variant = 'blue', ...props }: BadgeProps) {
  const variants = {
    red: 'bg-primary-bg text-primary',
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-600',
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
```

- [ ] **步骤 8：创建 Card 组件**

```typescript
// src/components/ui/card.tsx
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-4 border-b border-gray-100 flex items-center justify-between', className)}
      {...props}
    />
  )
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}
```

- [ ] **步骤 9：Commit**

```bash
git add src/lib/utils.ts src/components/ui/
git commit -m "feat: add base UI component library (Button, Input, Select, Modal, Tabs, Badge, Card)"
```

---

### 任务 4：布局组件

**文件：**
- 创建：`src/components/layout/sidebar.tsx`
- 创建：`src/components/layout/header.tsx`
- 创建：`src/components/layout/mobile-nav.tsx`
- 创建：`src/app/(dashboard)/layout.tsx`

- [ ] **步骤 1：创建 Sidebar 组件**

```typescript
// src/components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: '📊', label: '工作台' },
  { href: '/create', icon: '✍️', label: '创作' },
  { href: '/drafts', icon: '📋', label: '笔记库' },
  { href: '/analytics', icon: '📈', label: '数据分析' },
]

interface SidebarProps {
  userName?: string
  planInfo?: string
}

export function Sidebar({ userName = '用户', planInfo = '个人版' }: SidebarProps) {
  const pathname = usePathname()
  
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
          AF
        </div>
        <h2 className="text-base font-semibold">ArchFocus</h2>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-primary-bg text-primary' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              <span className="text-lg w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      {/* User Info */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary-bg text-primary flex items-center justify-center font-semibold text-sm">
          {userName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{userName}</div>
          <div className="text-xs text-gray-400">{planInfo}</div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **步骤 2：创建 MobileNav 组件**

```typescript
// src/components/layout/mobile-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: '📊', label: '工作台' },
  { href: '/create', icon: '✍️', label: '创作' },
  { href: '/drafts', icon: '📋', label: '笔记库' },
  { href: '/analytics', icon: '📈', label: '数据' },
]

export function MobileNav() {
  const pathname = usePathname()
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 text-center py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-gray-400'
              )}
            >
              <div className="text-lg mb-0.5">{item.icon}</div>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **步骤 3：创建 Header 组件**

```typescript
// src/components/layout/header.tsx
'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'

interface HeaderProps {
  title: string
  showHamburger?: boolean
  onHamburgerClick?: () => void
  rightContent?: React.ReactNode
}

export function Header({ title, showHamburger, onHamburgerClick, rightContent }: HeaderProps) {
  return (
    <header className="h-14 px-6 bg-white border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showHamburger && (
          <button
            onClick={onHamburgerClick}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {rightContent && <div>{rightContent}</div>}
    </header>
  )
}
```

- [ ] **步骤 4：创建 Dashboard Layout**

```typescript
// src/app/(dashboard)/layout.tsx
'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 bottom-0 w-[220px] z-40 transition-transform md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="md:ml-[220px] min-h-screen pb-16 md:pb-0">
        {children}
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  )
}
```

- [ ] **步骤 5：Commit**

```bash
git add src/components/layout/ src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add layout components (Sidebar, MobileNav, Header, DashboardLayout)"
```

---

### 任务 5：状态管理 (Zustand Stores)

**文件：**
- 创建：`src/stores/auth-store.ts`
- 创建：`src/stores/account-store.ts`
- 创建：`src/stores/ui-store.ts`

- [ ] **步骤 1：创建 Auth Store**

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  phone: string
  name?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user, token) => {
        set({ user, token, isAuthenticated: true })
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

- [ ] **步骤 2：创建 Account Store**

```typescript
// src/stores/account-store.ts
import { create } from 'zustand'
import type { Account } from '@/types'

interface AccountState {
  accounts: Account[]
  selectedAccountId: string | null
  isLoading: boolean
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
  deleteAccount: (id: string) => void
  selectAccount: (id: string | null) => void
  getSelectedAccount: () => Account | undefined
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  selectedAccountId: null,
  isLoading: false,
  
  setAccounts: (accounts) => set({ accounts }),
  
  addAccount: (account) => set((state) => ({ 
    accounts: [...state.accounts, account] 
  })),
  
  updateAccount: (id, updates) => set((state) => ({
    accounts: state.accounts.map((a) => 
      a.id === id ? { ...a, ...updates } : a
    ),
  })),
  
  deleteAccount: (id) => set((state) => ({
    accounts: state.accounts.filter((a) => a.id !== id),
    selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
  })),
  
  selectAccount: (id) => set({ selectedAccountId: id }),
  
  getSelectedAccount: () => {
    const state = get()
    return state.accounts.find((a) => a.id === state.selectedAccountId)
  },
}))
```

- [ ] **步骤 3：创建 UI Store**

```typescript
// src/stores/ui-store.ts
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  modals: {
    accountModal: boolean
    syncModal: boolean
    noteDetailModal: boolean
    scheduleModal: boolean
  }
  toggleSidebar: () => void
  closeSidebar: () => void
  openModal: (modal: keyof UIState['modals']) => void
  closeModal: (modal: keyof UIState['modals']) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  modals: {
    accountModal: false,
    syncModal: false,
    noteDetailModal: false,
    scheduleModal: false,
  },
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  
  openModal: (modal) => set((state) => ({
    modals: { ...state.modals, [modal]: true },
  })),
  
  closeModal: (modal) => set((state) => ({
    modals: { ...state.modals, [modal]: false },
  })),
}))
```

- [ ] **步骤 4：Commit**

```bash
git add src/stores/
git commit -m "feat: add Zustand stores (auth, account, ui)"
```

---

### 任务 6：API Routes

**文件：**
- 创建：`src/app/api/auth/route.ts`
- 创建：`src/app/api/accounts/route.ts`
- 创建：`src/app/api/notes/route.ts`
- 创建：`src/app/api/analytics/route.ts`
- 创建：`src/app/api/sync/route.ts`

- [ ] **步骤 1：创建 Auth API Route**

```typescript
// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-dev'
)

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json()
    
    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: '手机号和密码不能为空' },
        { status: 400 }
      )
    }
    
    const user = await prisma.user.findUnique({ where: { phone } })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      )
    }
    
    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      )
    }
    
    const token = await new SignJWT({ 
      userId: user.id, 
      phone: user.phone 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)
    
    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, phone: user.phone, name: user.name },
        token,
      },
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
```

- [ ] **步骤 2：创建 Accounts API Route**

```typescript
// src/app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/accounts - 获取当前用户的所有账号
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/accounts - 创建新账号
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, xiaohongshuId, email, phone, position, audience, description } = body
    
    if (!name || !position || !audience || !description) {
      return NextResponse.json(
        { success: false, error: '必填字段不能为空' },
        { status: 400 }
      )
    }
    
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name,
        xiaohongshuId,
        email,
        phone,
        position,
        audience,
        description,
      },
    })
    
    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('Create account error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/accounts - 更新账号
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ success: false, error: '账号ID不能为空' }, { status: 400 })
    }
    
    // 验证账号所属权
    const existing = await prisma.account.findFirst({
      where: { id, userId: user.id },
    })
    
    if (!existing) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }
    
    const account = await prisma.account.update({
      where: { id },
      data: updates,
    })
    
    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('Update account error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/accounts - 删除账号
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ success: false, error: '账号ID不能为空' }, { status: 400 })
    }
    
    // 验证账号所属权
    const existing = await prisma.account.findFirst({
      where: { id, userId: user.id },
    })
    
    if (!existing) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }
    
    await prisma.account.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
```

- [ ] **步骤 3：创建 Notes API Route**

```typescript
// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/notes - 获取笔记列表
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const status = searchParams.get('status') // pending | published
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const where: any = {
      account: { userId: user.id },
    }
    
    if (accountId) {
      where.accountId = accountId
    }
    
    if (status) {
      where.status = status
    }
    
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: { account: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.note.count({ where }),
    ])
    
    return NextResponse.json({
      success: true,
      data: { notes, total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/notes - 创建/保存笔记
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const body = await request.json()
    const { accountId, title, content, images, publishAt } = body
    
    if (!accountId || !title) {
      return NextResponse.json({ success: false, error: '账号和标题不能为空' }, { status: 400 })
    }
    
    // 验证账号所属权
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    })
    
    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }
    
    const note = await prisma.note.create({
      data: {
        accountId,
        title,
        content: content || '',
        images: JSON.stringify(images || []),
        status: 'pending',
        publishAt: publishAt ? new Date(publishAt) : null,
      },
    })
    
    return NextResponse.json({ success: true, data: note })
  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/notes - 更新笔记
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ success: false, error: '笔记ID不能为空' }, { status: 400 })
    }
    
    // 验证笔记所属权
    const existing = await prisma.note.findFirst({
      where: { id, account: { userId: user.id } },
    })
    
    if (!existing) {
      return NextResponse.json({ success: false, error: '笔记不存在' }, { status: 404 })
    }
    
    if (updates.images) {
      updates.images = JSON.stringify(updates.images)
    }
    
    const note = await prisma.note.update({
      where: { id },
      data: updates,
    })
    
    return NextResponse.json({ success: true, data: note })
  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/notes - 删除笔记
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ success: false, error: '笔记ID不能为空' }, { status: 400 })
    }
    
    // 验证笔记所属权
    const existing = await prisma.note.findFirst({
      where: { id, account: { userId: user.id } },
    })
    
    if (!existing) {
      return NextResponse.json({ success: false, error: '笔记不存在' }, { status: 404 })
    }
    
    await prisma.note.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
```

- [ ] **步骤 4：创建 Sync API Route**

```typescript
// src/app/api/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { fetchNotes } from '@/lib/tiktokomni'

// GET /api/sync - 获取同步配置
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    let config = await prisma.syncConfig.findFirst()
    
    if (!config) {
      config = await prisma.syncConfig.create({
        data: { intervalDays: 1, syncTime: '02:00' },
      })
    }
    
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Get sync config error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/sync - 更新同步配置
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const body = await request.json()
    const { intervalDays, syncTime } = body
    
    let config = await prisma.syncConfig.findFirst()
    
    if (!config) {
      config = await prisma.syncConfig.create({
        data: { intervalDays: intervalDays || 1, syncTime: syncTime || '02:00' },
      })
    } else {
      config = await prisma.syncConfig.update({
        where: { id: config.id },
        data: { intervalDays, syncTime },
      })
    }
    
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Update sync config error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/sync - 触发手动同步
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    
    const body = await request.json()
    const { accountIds } = body
    
    // 获取需要同步的账号
    const accounts = await prisma.account.findMany({
      where: {
        userId: user.id,
        ...(accountIds?.length ? { id: { in: accountIds } } : {}),
      },
    })
    
    const results = []
    
    for (const account of accounts) {
      if (!account.xiaohongshuId) continue
      
      try {
        // 从 TikOmni 获取数据
        const syncResult = await fetchNotes(account.id, account.xiaohongshuId)
        
        // 更新笔记数据
        for (const noteData of syncResult.notes) {
          await prisma.note.upsert({
            where: { id: noteData.note_id },
            create: {
              id: noteData.note_id,
              accountId: account.id,
              title: noteData.title,
              content: noteData.content,
              images: JSON.stringify(noteData.images),
              likes: noteData.likes,
              comments: noteData.comments,
              bookmarks: noteData.bookmarks,
              shares: noteData.shares,
              status: 'published',
              publishedAt: new Date(noteData.published_at),
              xiaohongshuUrl: noteData.url,
            },
            update: {
              title: noteData.title,
              content: noteData.content,
              images: JSON.stringify(noteData.images),
              likes: noteData.likes,
              comments: noteData.comments,
              bookmarks: noteData.bookmarks,
              shares: noteData.shares,
            },
          })
        }
        
        results.push({ accountId: account.id, success: true, count: syncResult.notes.length })
      } catch (error) {
        console.error(`Sync error for account ${account.id}:`, error)
        results.push({ accountId: account.id, success: false, error: '同步失败' })
      }
    }
    
    // 更新同步配置的最后同步时间
    await prisma.syncConfig.update({
      where: { id: (await prisma.syncConfig.findFirst())!.id },
      data: { lastSyncAt: new Date() },
    })
    
    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
```

- [ ] **步骤 5：创建 auth helper**

```typescript
// src/lib/auth.ts
import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-dev'
)

export interface AuthUser {
  id: string
  phone: string
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.substring(7)
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    return {
      id: payload.userId as string,
      phone: payload.phone as string,
    }
  } catch {
    return null
  }
}
```

- [ ] **步骤 6：Commit**

```bash
git add src/app/api/ src/lib/auth.ts
git commit -m "feat: add API routes (auth, accounts, notes, sync)"
```

---

### 任务 7：页面组件

**文件：**
- 创建：`src/app/(auth)/login/page.tsx`
- 创建：`src/app/(dashboard)/page.tsx` (工作台)
- 创建：`src/app/(dashboard)/create/page.tsx` (创作)
- 创建：`src/app/(dashboard)/drafts/page.tsx` (笔记库)
- 创建：`src/app/(dashboard)/analytics/page.tsx` (数据分析)

- [ ] **步骤 1：创建登录页面**

```typescript
// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!phone || !password) {
      setError('请输入手机号和密码')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await api.post('/auth', { phone, password })
      
      if (response.data.success) {
        login(response.data.data.user, response.data.data.token)
        localStorage.setItem('auth_token', response.data.data.token)
        router.push('/')
      } else {
        setError(response.data.error || '登录失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-bg via-white to-orange-50 p-5">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">📌 ArchFocus</h1>
          <p className="text-gray-500 text-sm mt-1">小红书 AI 运营助手</p>
        </div>
        
        <div className="space-y-5">
          <Input
            label="手机号"
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </Button>
          
          <p className="text-center text-xs text-gray-400 mt-4">
            账号由管理员在后台创建，请联系管理员获取
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **步骤 2：创建工作台页面**

```typescript
// src/app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccountStore } from '@/stores/account-store'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import type { Account, Note } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { accounts, setAccounts, addAccount, updateAccount, deleteAccount } = useAccountStore()
  const [stats, setStats] = useState({ published: 0, pending: 0 })
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [accountForm, setAccountForm] = useState({
    name: '',
    xiaohongshuId: '',
    email: '',
    phone: '',
    position: '',
    audience: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [accountsRes, notesRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/notes?limit=100'),
      ])
      
      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data)
      }
      
      if (notesRes.data.success) {
        const notes = notesRes.data.data.notes
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const published = notes.filter((n: Note) => 
          n.status === 'published' && 
          new Date(n.publishedAt!) >= monthStart
        ).length
        
        const pending = notes.filter((n: Note) => n.status === 'pending').length
        
        setStats({ published, pending })
      }
    } catch (error) {
      console.error('Load data error:', error)
    }
  }

  const handleSaveAccount = async () => {
    try {
      if (editingAccount) {
        const res = await api.put('/accounts', { id: editingAccount.id, ...accountForm })
        if (res.data.success) {
          updateAccount(editingAccount.id, res.data.data)
        }
      } else {
        const res = await api.post('/accounts', accountForm)
        if (res.data.success) {
          addAccount(res.data.data)
        }
      }
      setShowAccountModal(false)
      resetForm()
    } catch (error) {
      console.error('Save account error:', error)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('确定要删除该账号吗？')) return
    
    try {
      const res = await api.delete(`/accounts?id=${id}`)
      if (res.data.success) {
        deleteAccount(id)
      }
    } catch (error) {
      console.error('Delete account error:', error)
    }
  }

  const resetForm = () => {
    setAccountForm({
      name: '', xiaohongshuId: '', email: '', phone: '',
      position: '', audience: '', description: '',
    })
    setEditingAccount(null)
  }

  const openEditModal = (account: Account) => {
    setEditingAccount(account)
    setAccountForm({
      name: account.name,
      xiaohongshuId: account.xiaohongshuId || '',
      email: account.email || '',
      phone: account.phone || '',
      position: account.position,
      audience: account.audience,
      description: account.description,
    })
    setShowAccountModal(true)
  }

  return (
    <>
      <Header title="工作台" />
      
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardBody>
              <div className="text-sm text-gray-500 mb-1">当月已发布</div>
              <div className="text-3xl font-bold text-primary">{stats.published}</div>
              <div className="text-xs text-gray-400 mt-1">本月已发布笔记数</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-sm text-gray-500 mb-1">当月待发布</div>
              <div className="text-3xl font-bold text-accent-orange">{stats.pending}</div>
              <div className="text-xs text-gray-400 mt-1">待发布 / 待审核</div>
            </CardBody>
          </Card>
        </div>

        {/* Account Management */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">👤 账户管理</span>
              <Button size="sm" onClick={() => setShowAccountModal(true)}>
                + 添加账号
              </Button>
            </div>
            
            {accounts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p>暂无绑定账号</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 border border-gray-100 rounded-xl hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => openEditModal(account)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary-bg text-primary flex items-center justify-center font-bold text-lg">
                        {account.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{account.name}</div>
                        {account.xiaohongshuId && (
                          <div className="text-xs text-gray-400">ID: {account.xiaohongshuId}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-500">待发布 0</span>
                      <Badge variant={account.status === 'active' ? 'blue' : 'orange'}>
                        {account.status === 'active' ? '绑定账户' : '待绑定'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardBody className="flex flex-col gap-3">
            <Button onClick={() => router.push('/create')}>✍️ 开始创作新笔记</Button>
            <Button variant="outline" onClick={() => router.push('/analytics')}>
              📈 查看数据分析
            </Button>
            <Button variant="outline" onClick={() => router.push('/drafts')}>
              📋 管理笔记库
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Account Modal */}
      <Modal open={showAccountModal} onOpenChange={setShowAccountModal}>
        <ModalContent>
          <ModalHeader>
            <h3>{editingAccount ? '编辑账号' : '添加账号'}</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="小红书账号名称 *"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              />
              <Input
                label="小红书 ID"
                value={accountForm.xiaohongshuId}
                onChange={(e) => setAccountForm({ ...accountForm, xiaohongshuId: e.target.value })}
              />
              <Input
                label="联系邮箱"
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
              />
              <Input
                label="手机号"
                value={accountForm.phone}
                onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
              />
              <Input
                label="账号定位（一句话）*"
                value={accountForm.position}
                onChange={(e) => setAccountForm({ ...accountForm, position: e.target.value })}
              />
              <Input
                label="目标受众 *"
                value={accountForm.audience}
                onChange={(e) => setAccountForm({ ...accountForm, audience: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  人设详细描述 *（1000字限制）
                </label>
                <textarea
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 h-32 resize-none"
                  value={accountForm.description}
                  onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value.slice(0, 1000) })}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            {editingAccount && (
              <Button variant="danger" onClick={() => handleDeleteAccount(editingAccount.id)}>
                删除
              </Button>
            )}
            <Button variant="outline" onClick={() => { setShowAccountModal(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleSaveAccount}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
```

- [ ] **步骤 3：创建创作页面（简化版，Phase 1 暂不包含 AI 功能）**

```typescript
// src/app/(dashboard)/create/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccountStore } from '@/stores/account-store'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import api from '@/lib/api'

const STEPS = ['选题', '文案', '配图', '发布']

export default function CreatePage() {
  const router = useRouter()
  const { accounts, selectedAccountId, selectAccount, getSelectedAccount } = useAccountStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const selectedAccount = getSelectedAccount()

  const handleSaveDraft = async () => {
    if (!selectedAccount || !title) {
      alert('请选择账号并输入标题')
      return
    }
    
    setSaving(true)
    try {
      const res = await api.post('/notes', {
        accountId: selectedAccount.id,
        title,
        content,
        images,
      })
      
      if (res.data.success) {
        alert('草稿保存成功')
        router.push('/drafts')
      }
    } catch (error) {
      console.error('Save draft error:', error)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const canNext = currentStep === 0 ? title : currentStep === 1 ? content : true

  return (
    <>
      <Header 
        title="创作新笔记"
        rightContent={
          <Select value={selectedAccountId || ''} onValueChange={selectAccount}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择账号" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      
      <div className="p-6">
        {/* Steps */}
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="flex">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`
                  flex-1 py-3.5 text-sm text-center font-medium transition-colors
                  ${index === currentStep ? 'text-primary border-b-2 border-primary bg-primary-bg' : 
                    index < currentStep ? 'text-green-600' : 'text-gray-400'}
                `}
              >
                <span className="mr-1.5">{index + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardBody className="min-h-96">
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">💡</div>
                  <h3 className="text-lg font-medium">开始创作</h3>
                  <p className="text-gray-500 text-sm">输入笔记主题或标题</p>
                </div>
                <Input
                  label="笔记标题"
                  placeholder="输入标题..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right">{title.length}/100</p>
              </div>
            )}
            
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">笔记内容</h3>
                  <span className="text-xs text-gray-400">可直接点击内容进行修改</span>
                </div>
                <textarea
                  className="w-full h-64 p-4 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none"
                  placeholder="输入笔记内容..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right">{content.length}/1000</p>
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">🎨</div>
                <h3 className="text-lg font-medium mb-2">配图功能</h3>
                <p className="text-gray-500 text-sm mb-6">Phase 2 将支持 AI 生成配图</p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 max-w-sm mx-auto">
                  <p className="text-gray-400 text-sm">暂时支持手动上传</p>
                </div>
              </div>
            )}
            
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium text-center mb-6">📝 发布确认</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="font-medium mb-2">标题</div>
                  <div className="text-gray-700">{title || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="font-medium mb-2">内容</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{content || '-'}</div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            上一步
          </Button>
          
          {currentStep < 3 ? (
            <Button
              className="flex-1"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canNext}
            >
              下一步
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                保存草稿
              </Button>
              <Button onClick={handleSaveDraft} disabled={saving}>
                立即发布
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **步骤 4：创建笔记库页面**

```typescript
// src/app/(dashboard)/drafts/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/components/ui/modal'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useAccountStore } from '@/stores/account-store'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Note } from '@/types'

export default function DraftsPage() {
  const { accounts, selectedAccountId, selectAccount } = useAccountStore()
  const [pendingNotes, setPendingNotes] = useState<Note[]>([])
  const [publishedNotes, setPublishedNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  useEffect(() => {
    loadNotes()
  }, [selectedAccountId])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const params = selectedAccountId ? `&accountId=${selectedAccountId}` : ''
      
      const [pendingRes, publishedRes] = await Promise.all([
        api.get(`/notes?status=pending${params}`),
        api.get(`/notes?status=published${params}&limit=50`),
      ])
      
      if (pendingRes.data.success) {
        setPendingNotes(pendingRes.data.data.notes)
      }
      if (publishedRes.data.success) {
        setPublishedNotes(publishedRes.data.data.notes)
      }
    } catch (error) {
      console.error('Load notes error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPublished = async (note: Note) => {
    try {
      const res = await api.put('/notes', { 
        id: note.id, 
        status: 'published',
        publishedAt: new Date().toISOString(),
      })
      if (res.data.success) {
        setPendingNotes(pendingNotes.filter(n => n.id !== note.id))
        setPublishedNotes([res.data.data, ...publishedNotes])
      }
    } catch (error) {
      console.error('Mark published error:', error)
    }
  }

  const handleDeleteNote = async (note: Note) => {
    if (!confirm('确定要删除该笔记吗？')) return
    
    try {
      const res = await api.delete(`/notes?id=${note.id}`)
      if (res.data.success) {
        setPendingNotes(pendingNotes.filter(n => n.id !== note.id))
        setPublishedNotes(publishedNotes.filter(n => n.id !== note.id))
      }
    } catch (error) {
      console.error('Delete note error:', error)
    }
  }

  const NoteCard = ({ note }: { note: Note }) => (
    <div 
      className="p-4 border border-gray-100 rounded-xl hover:border-primary/30 cursor-pointer transition-colors"
      onClick={() => setSelectedNote(note)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium line-clamp-2 flex-1">{note.title}</h4>
        {note.status === 'published' && (
          <Badge variant="green">已发布</Badge>
        )}
      </div>
      {note.account && (
        <div className="text-xs text-gray-400 mb-2">{note.account.name}</div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(note.createdAt)}</span>
        {note.status === 'published' ? (
          <span>👍 {note.likes} 💬 {note.comments}</span>
        ) : (
          <span>待发布</span>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Header 
        title="笔记库"
        rightContent={
          <Select value={selectedAccountId || 'all'} onValueChange={(v) => selectAccount(v === 'all' ? null : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部账号" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部账号</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      
      <div className="p-6">
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              待发布 <Badge variant="orange" className="ml-2">{pendingNotes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="published">
              已发布 <Badge variant="green" className="ml-2">{publishedNotes.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {pendingNotes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📝</div>
                <p>暂无待发布笔记</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="published">
            {publishedNotes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p>暂无已发布笔记</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publishedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Note Detail Modal */}
      <Modal open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <ModalContent>
          <ModalHeader>
            <h3>{selectedNote?.title}</h3>
          </ModalHeader>
          <ModalBody>
            {selectedNote && (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  {selectedNote.account?.name} · {formatDate(selectedNote.publishedAt || selectedNote.createdAt)}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                  {selectedNote.content}
                </div>
                {selectedNote.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedNote.images.map((img, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                )}
                {selectedNote.status === 'published' && (
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>👍 {selectedNote.likes}</span>
                    <span>💬 {selectedNote.comments}</span>
                    <span>⭐ {selectedNote.bookmarks}</span>
                    <span>↗️ {selectedNote.shares}</span>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
```

- [ ] **步骤 5：创建数据分析页面**

```typescript
// src/app/(dashboard)/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useAccountStore } from '@/stores/account-store'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Note, AnalyticsFilter, SortField, SortDirection } from '@/types'

export default function AnalyticsPage() {
  const { accounts, selectedAccountId, selectAccount } = useAccountStore()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<AnalyticsFilter>({})
  const [sortField, setSortField] = useState<SortField>('publishedAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  useEffect(() => {
    loadAnalytics()
  }, [selectedAccountId, filter])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedAccountId) params.append('accountId', selectedAccountId)
      if (filter.startDate) params.append('startDate', filter.startDate)
      if (filter.endDate) params.append('endDate', filter.endDate)
      
      const res = await api.get(`/notes?status=published&${params.toString()}&limit=100`)
      if (res.data.success) {
        setNotes(res.data.data.notes)
      }
    } catch (error) {
      console.error('Load analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedNotes = [...notes].sort((a, b) => {
    const aVal = a[sortField] || 0
    const bVal = b[sortField] || 0
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  const filteredNotes = sortedNotes.filter(note => {
    if (filter.likesMin && note.likes < filter.likesMin) return false
    if (filter.likesMax && note.likes > filter.likesMax) return false
    if (filter.bookmarksMin && note.bookmarks < filter.bookmarksMin) return false
    if (filter.bookmarksMax && note.bookmarks > filter.bookmarksMax) return false
    if (filter.commentsMin && note.comments < filter.commentsMin) return false
    if (filter.commentsMax && note.comments > filter.commentsMax) return false
    return true
  })

  const handleExportCSV = () => {
    const headers = ['标题', '账号', '点赞', '评论', '收藏', '转发', '发布时间']
    const rows = filteredNotes.map(n => [
      n.title,
      (n as any).account?.name || '',
      n.likes,
      n.comments,
      n.bookmarks,
      n.shares,
      formatDate(n.publishedAt || n.createdAt),
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${formatDate(new Date())}.csv`
    a.click()
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-xs opacity-40">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <>
      <Header 
        title="数据分析"
        rightContent={
          <div className="flex gap-2">
            <Select value={selectedAccountId || 'all'} onValueChange={(v) => selectAccount(v === 'all' ? null : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部账号" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部账号</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      
      <div className="p-6">
        {/* Filter Bar */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-500">时间</label>
                <input
                  type="date"
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.startDate || ''}
                  onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.endDate || ''}
                  onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-500">点赞</label>
                <input
                  type="number"
                  placeholder="最小"
                  className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.likesMin || ''}
                  onChange={(e) => setFilter({ ...filter, likesMin: Number(e.target.value) })}
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  placeholder="最大"
                  className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.likesMax || ''}
                  onChange={(e) => setFilter({ ...filter, likesMax: Number(e.target.value) })}
                />
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilter({})}
              >
                重置
              </Button>
              
              <div className="ml-auto">
                <Button size="sm" onClick={handleExportCSV}>
                  📥 导出 CSV
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Data Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">笔记</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">账号</th>
                  <th 
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary sortable"
                    onClick={() => handleSort('likes')}
                  >
                    点赞 <SortIcon field="likes" />
                  </th>
                  <th 
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('comments')}
                  >
                    评论 <SortIcon field="comments" />
                  </th>
                  <th 
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('bookmarks')}
                  >
                    收藏 <SortIcon field="bookmarks" />
                  </th>
                  <th 
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('shares')}
                  >
                    转发 <SortIcon field="shares" />
                  </th>
                  <th 
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('publishedAt')}
                  >
                    发布时间 <SortIcon field="publishedAt" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note) => (
                    <tr key={note.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <a 
                          href={note.xiaohongshuUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline line-clamp-2"
                        >
                          {note.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{(note as any).account?.name || '-'}</td>
                      <td className="px-4 py-3">{note.likes}</td>
                      <td className="px-4 py-3">{note.comments}</td>
                      <td className="px-4 py-3">{note.bookmarks}</td>
                      <td className="px-4 py-3">{note.shares}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(note.publishedAt || note.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">共 {filteredNotes.length} 条</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>上一页</Button>
              <Button variant="outline" size="sm" disabled>下一页</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
```

- [ ] **步骤 6：Commit**

```bash
git add src/app/\(auth\)/login/ src/app/\(dashboard\)/
git commit -m "feat: add pages (login, dashboard, create, drafts, analytics)"
```

---

### 任务 8：Root Layout 与全局配置

**文件：**
- 创建：`src/app/layout.tsx`
- 创建：`src/app/globals.css`
- 创建：`src/app/providers.tsx`

- [ ] **步骤 1：创建全局样式**

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #e8455c;
  --primary-light: #ff6b81;
  --primary-bg: #fff0f2;
  --accent-blue: #2d9cdb;
  --accent-green: #27ae60;
  --accent-orange: #f2994a;
  --text: #1a1a2e;
  --text-secondary: #6b7280;
  --text-light: #9ca3af;
  --bg: #f5f5f7;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 14px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: var(--primary);
  text-decoration: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
```

- [ ] **步骤 2：创建 Providers**

```typescript
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

- [ ] **步骤 3：创建 Root Layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'ArchFocus - 小红书 AI 运营助手',
  description: '面向小红书个人博主的单人多账号 AI 运营 SaaS 平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **步骤 4：Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/providers.tsx
git commit -m "feat: add root layout and global styles"
```

---

### 任务 9：环境配置与 README

**文件：**
- 创建：`README.md`
- 创建：`.gitignore`

- [ ] **步骤 1：创建 README**

```markdown
# ArchFocus - 小红书 AI 运营助手

面向小红书个人博主的单人多账号 AI 运营 SaaS 平台。

## 技术栈

- **前端**: React 18 + TypeScript + Next.js 14 (App Router)
- **状态管理**: Zustand
- **UI**: Tailwind CSS + Radix UI
- **数据获取**: React Query + Axios
- **后端**: Next.js API Routes
- **数据库**: SQLite (开发) / PostgreSQL (生产) + Prisma ORM

## 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | HTML 原型 | ✅ 已完成 |
| Phase 1 | MVP - React + API + TikOmni | 🔄 进行中 |
| Phase 2 | AI 能力 - LangGraph 编排 | 📋 待开发 |
| Phase 3 | 定时同步、邮件提醒 | 📋 待开发 |
| Phase 4 | 多用户、订阅计划 | 📋 待开发 |

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 创建数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

### 环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

## 项目结构

```
src/
├── app/              # Next.js App Router
│   ├── (auth)/       # 认证页面
│   ├── (dashboard)/  # 业务页面
│   └── api/          # API Routes
├── components/       # React 组件
│   ├── ui/           # 基础 UI 组件
│   ├── layout/       # 布局组件
│   └── ...           # 业务组件
├── hooks/            # 自定义 Hooks
├── stores/           # Zustand 状态管理
├── lib/              # 工具库
└── types/            # TypeScript 类型
```

## 功能模块

- [ ] 工作台 - 统计概览、账号管理
- [ ] 创作 - 四步向导（选题→文案→配图→发布）
- [ ] 笔记库 - 待发布/已发布笔记管理
- [ ] 数据分析 - TikOmni 数据同步、筛选排序、CSV 导出
- [ ] AI 能力 - 文案生成、去AI位、配图生成（Phase 2）

## License

MIT
```

- [ ] **步骤 2：创建 .gitignore**

```gitignore
# Dependencies
node_modules
.pnp
.pnp.js

# Build
.next
out
build
dist

# Database
*.db
*.db-journal

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage

# Misc
*.log
```

- [ ] **步骤 3：Commit**

```bash
git add README.md .gitignore
git commit -m "docs: add README and gitignore"
```

---

## 自检清单

### 规格覆盖度

| PRD 章节 | 对应任务 | 状态 |
|---------|---------|------|
| 2.1 认证与基础架构 | 任务 6 (API) + 任务 7 (登录页) | ✅ |
| 2.2 工作台 | 任务 7 (Dashboard 页面) | ✅ |
| 2.3 创作 | 任务 7 (Create 页面) - Phase 1 简化版 | ✅ |
| 2.4 笔记库 | 任务 7 (Drafts 页面) | ✅ |
| 2.5 数据分析 | 任务 7 (Analytics 页面) | ✅ |
| 2.6 模态框系统 | 任务 3 (UI 组件) | ✅ |
| 4.1-4.2 数据模型 | 任务 1 (Prisma Schema) | ✅ |

### 占位符扫描

- [x] 无"TODO"占位符
- [x] 无"待定"内容
- [x] 所有步骤包含实际代码

### 类型一致性

- [x] TypeScript 类型定义完整 (`src/types/index.ts`)
- [x] API 响应类型一致
- [x] 组件 Props 类型正确

---

## 执行交接

**计划已完成并保存到 `docs/superpowers/plans/2026-06-07-archfocus-mvp-architecture.md`。两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

**选哪种方式？**

---

*计划版本：v1.0*
*创建日期：2026-06-07*
