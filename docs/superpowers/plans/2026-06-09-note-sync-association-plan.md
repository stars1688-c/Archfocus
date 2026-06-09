# 笔记同步与关联功能实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现无图笔记支持和笔记同步与关联功能

**架构：** 通过在 Prisma Note 模型新增 `platformSource` 和 `syncStatus` 字段区分笔记来源和同步状态，同步时按标题匹配（允许≤3字差异）自动关联平台笔记与本地笔记。

**技术栈：** Next.js 14, Prisma (SQLite), TypeScript, Tailwind CSS

---

## 文件变更清单

| 文件 | 职责 |
|------|------|
| `prisma/schema.prisma` | 新增 platformSource 和 syncStatus 字段 |
| `src/types/index.ts` | Note 接口新增字段 |
| `src/app/api/sync/route.ts` | 同步逻辑重构：标题匹配算法、关联状态计算 |
| `src/app/(dashboard)/create/page.tsx` | 跳过配图按钮、无图笔记处理 |
| `src/app/(dashboard)/drafts/page.tsx` | Badge 显示关联状态 |

---

## 任务 1：数据库迁移

**文件：**
- 修改：`prisma/schema.prisma:46-63`

- [ ] **步骤 1：修改 Prisma schema**

在 `model Note {}` 块内 `createdAt` 字段前添加：

```prisma
model Note {
  id             String    @id @default(cuid())
  accountId      String
  account        Account   @relation(fields: [accountId], references: [id])
  title          String
  content        String
  images         String    @default("[]")
  likes          Int       @default(0)
  comments       Int       @default(0)
  bookmarks      Int       @default(0)
  shares        Int       @default(0)
  status         String    @default("pending")
  publishAt      DateTime?
  publishedAt    DateTime?
  xiaohongshuUrl String?
  platformSource String    @default("platform")  // "platform" | "external"
  syncStatus    String    @default("linked")   // "linked" | "pending_link" | "not_found"
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

- [ ] **步骤 2：执行数据库迁移**

```bash
npx prisma db push
```

预期输出：`The database is now in sync with your Prisma schema.`

---

## 任务 2：更新 TypeScript 类型

**文件：**
- 修改：`src/types/index.ts:25-41`

- [ ] **步骤 1：更新 Note 接口**

将 `Note` 接口修改为：

```typescript
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
  platformSource: 'platform' | 'external'  // 新增
  syncStatus: 'linked' | 'pending_link' | 'not_found'  // 新增
  createdAt: Date
  updatedAt: Date
}
```

同样更新 `NoteWithAccount` 扩展接口：

```typescript
export interface NoteWithAccount extends Note {
  account?: {
    name: string
  }
}
```

- [ ] **步骤 2：验证类型编译**

```bash
npx tsc --noEmit
```

预期：无错误输出

---

## 任务 3：实现标题匹配算法

**文件：**
- 创建：`src/lib/notes.ts`（匹配算法工具函数）

- [ ] **步骤 1：创建匹配算法工具函数**

新建文件 `src/lib/notes.ts`：

```typescript
/**
 * 计算两个字符串的差异字符数（Levenshtein 距离）
 */
export function calculateStringDiff(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 0

  const len1 = s1.length
  const len2 = s2.length
  const maxLen = Math.max(len1, len2)

  // 简单实现：字符对比
  let diff = 0
  const minLen = Math.min(len1, len2)

  for (let i = 0; i < minLen; i++) {
    if (s1[i] !== s2[i]) diff++
  }

  // 加上长度差异
  diff += Math.abs(len1 - len2)

  return diff
}

/**
 * 判断两个标题是否匹配（允许 ≤3 字差异）
 */
export function isTitleMatch(title1: string, title2: string, maxDiff = 3): boolean {
  return calculateStringDiff(title1, title2) <= maxDiff
}

/**
 * 在列表中查找与给定标题匹配的笔记
 */
export function findMatchingNote(
  platformNote: { title: string; note_id: string },
  localNotes: Array<{ id: string; title: string }>
): { id: string; title: string } | null {
  for (const note of localNotes) {
    if (isTitleMatch(platformNote.title, note.title)) {
      return note
    }
  }
  return null
}
```

- [ ] **步骤 2：验证类型编译**

```bash
npx tsc --noEmit
```

预期：无错误输出

---

## 任务 4：重构同步逻辑

**文件：**
- 修改：`src/app/api/sync/route.ts`

- [ ] **步骤 1：重构 POST /api/sync**

将整个 `POST` 函数替换为以下实现：

```typescript
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

    // 统计信息
    const stats = {
      linked: 0,
      pendingLink: 0,
      externalNew: 0,
      movedToPublished: 0,
    }

    const results = []

    for (const account of accounts) {
      if (!account.xiaohongshuId) continue

      try {
        // 从 TikOmni 获取数据
        const syncResult = await fetchNotes(account.id, account.xiaohongshuId)

        // 获取本地已发布和待发布列表
        const localPublishedNotes = await prisma.note.findMany({
          where: { accountId: account.id, status: 'published' },
          select: { id: true, title: true, platformSource: true, syncStatus: true },
        })

        const localPendingNotes = await prisma.note.findMany({
          where: { accountId: account.id, status: 'pending' },
          select: { id: true, title: true },
        })

        // 收集已匹配的本地笔记 ID
        const matchedNoteIds = new Set<string>()

        // 遍历 TikOmni 笔记，进行匹配
        for (const noteData of syncResult.notes) {
          // 先在已发布列表中查找匹配
          const publishedMatch = findMatchingNote(
            { title: noteData.title, note_id: noteData.note_id },
            localPublishedNotes
          )

          if (publishedMatch) {
            // Case 1: TikOmni 有 + 已发布有 = 平台创作，已关联
            matchedNoteIds.add(publishedMatch.id)
            await prisma.note.update({
              where: { id: publishedMatch.id },
              data: { platformSource: 'platform', syncStatus: 'linked' },
            })
            stats.linked++
            continue
          }

          // 再在待发布列表中查找匹配
          const pendingMatch = findMatchingNote(
            { title: noteData.title, note_id: noteData.note_id },
            localPendingNotes
          )

          if (pendingMatch) {
            // Case 2: TikOmni 有 + 待发布有 = 平台创作，已关联，自动移至已发布
            matchedNoteIds.add(pendingMatch.id)
            await prisma.note.update({
              where: { id: pendingMatch.id },
              data: {
                status: 'published',
                publishedAt: new Date(noteData.published_at),
                platformSource: 'platform',
                syncStatus: 'linked',
              },
            })
            stats.linked++
            stats.movedToPublished++
            continue
          }

          // Case 3: TikOmni 有 + 本地都没有 = 非平台创作，入库
          await prisma.note.create({
            data: {
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
              platformSource: 'external',
              syncStatus: 'linked',
            },
          })
          stats.externalNew++
        }

        // Case 4: 已发布列表中有但 TikOmni 找不到的 = 非平台创作，待关联
        for (const note of localPublishedNotes) {
          if (!matchedNoteIds.has(note.id) && note.platformSource === 'platform') {
            await prisma.note.update({
              where: { id: note.id },
              data: { syncStatus: 'pending_link' },
            })
            stats.pendingLink++
          }
        }

        results.push({ accountId: account.id, success: true, count: syncResult.notes.length })
      } catch (error) {
        console.error(`Sync error for account ${account.id}:`, error)
        results.push({ accountId: account.id, success: false, error: '同步失败' })
      }
    }

    // 更新同步配置的最后同步时间
    const syncConfig = await prisma.syncConfig.findFirst()
    if (syncConfig) {
      await prisma.syncConfig.update({
        where: { id: syncConfig.id },
        data: { lastSyncAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, data: { results, stats } })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
```

- [ ] **步骤 2：在文件顶部添加 import**

在 `import { fetchNotes } from '@/lib/tiktokomni'` 后添加：

```typescript
import { findMatchingNote } from '@/lib/notes'
```

- [ ] **步骤 3：验证类型编译**

```bash
npx tsc --noEmit
```

预期：无错误输出

---

## 任务 5：添加跳过配图功能

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：在配图步骤添加跳过按钮**

找到 Step 2 的"生成图片"按钮区域，在 `imageGenerating` 状态按钮后添加：

在 `imageType === 'ai_prompt' && promptConfirmed` 的 div 内，找到 `生成图片` Button，在其后添加：

```tsx
{/* 跳过配图选项 */}
{!generatedImageUrl && (
  <Button
    variant="ghost"
    onClick={() => {
      setImages([])
      setCurrentStep(3) // 跳到发布步骤
    }}
    className="w-full mt-2 text-gray-400"
  >
    跳过配图
  </Button>
)}
```

同样在 `imageType === 'html_screenshot'` 的 div 内添加相同的跳过按钮。

- [ ] **步骤 2：验证类型编译**

```bash
npx tsc --noEmit
```

预期：无错误输出

---

## 任务 6：更新笔记库 Badge 显示

**文件：**
- 修改：`src/app/(dashboard)/drafts/page.tsx`

- [ ] **步骤 1：添加 syncStatusBadge 辅助函数**

在 `NoteCard` 组件前添加：

```typescript
// 根据 syncStatus 显示 Badge
const getSyncStatusBadge = (note: NoteWithAccount) => {
  if (note.platformSource === 'external') {
    return <Badge variant="blue">非平台创作</Badge>
  }
  if (note.syncStatus === 'pending_link') {
    return <Badge variant="orange">非平台创作，待关联</Badge>
  }
  if (note.syncStatus === 'linked') {
    return <Badge variant="green">平台创作，已关联</Badge>
  }
  return null
}
```

- [ ] **步骤 2：在 NoteCard 中显示 Badge**

找到 `NoteCard` 组件内的 `{note.status === 'published' && ...}` 区域，修改为：

```tsx
<div className="flex items-start justify-between mb-2">
  <h4 className="font-medium line-clamp-2 flex-1">{note.title}</h4>
  <div className="flex items-center gap-1">
    {note.status === 'published' && getSyncStatusBadge(note)}
    {note.status === 'published' && (
      <Badge variant="green">已发布</Badge>
    )}
  </div>
</div>
```

- [ ] **步骤 3：验证类型编译**

```bash
npx tsc --noEmit
```

预期：无错误输出

---

## 任务 7：处理无图笔记显示

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：在发布确认页面显示无配图提示**

在 Step 3（发布确认）的图片预览区域，找到：

```tsx
{generatedImageUrl && (
  <div className="bg-gray-50 rounded-xl p-4">
    ...
  </div>
)}
```

在其后添加：

```tsx
{images.length === 0 && !generatedImageUrl && (
  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400">
    无配图
  </div>
)}
```

- [ ] **步骤 2：验证类型编译**

```bash
npx tsc --noEmit
```

预期：无错误输出

---

## 任务 8：构建验证

- [ ] **步骤 1：执行完整构建**

```bash
npm run build 2>&1 | tail -30
```

预期：构建成功，无错误

---

## 任务 9：提交代码

- [ ] **步骤 1：提交所有变更**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat: 实现笔记同步与关联功能

- 新增 platformSource 和 syncStatus 字段区分笔记来源
- 实现标题匹配算法（允许≤3字差异）
- 重构同步逻辑，自动关联平台笔记与本地笔记
- 支持无图笔记，跳过配图功能
- 笔记库显示关联状态 Badge
EOF
)"
```
