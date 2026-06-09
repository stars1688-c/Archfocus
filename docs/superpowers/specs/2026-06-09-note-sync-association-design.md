# 笔记同步与关联功能设计

## 概述

本次需求包含两个独立功能：
1. **无图笔记支持**：配图生成可以选择跳过
2. **笔记同步与关联**：通过 TikOmni 获取的笔记与本地笔记进行智能关联

## 功能一：无图笔记

### 需求描述
配图生成可以选择跳过，支持没有图片的笔记。

### 实现方案

#### 前端变更
- 在配图步骤（Step 3）增加"跳过配图"按钮
- 跳过时 `images` 字段存储空数组 `[]`

#### 触发条件
- 当用户没有生成任何配图时，可以点击"跳过配图"
- 跳过后的笔记在发布确认页面图片区域显示"无配图"

---

## 功能二：笔记同步与关联

### 背景概念

- **平台创作**：使用我们平台创作的笔记
- **非平台创作**：TikOmni 有记录但非我们平台创作
- **TikOmni 笔记**：通过 TikOmni 平台获取的小红书所有笔记

### 关联状态

| 情况 | TikOmni有 | 已发布 | 待发布 | 标签 | 操作 |
|------|----------|--------|--------|------|------|
| Case 1 | ✓ | ✓ | - | 平台创作，已关联 | - |
| Case 2 | ✓ | - | ✓ | 平台创作，已关联 | 自动：待发布→已发布 |
| Case 3 | ✓ | - | - | 非平台创作 | 入库已发布，标记非平台创作 |
| Case 4 | - | ✓ | - | 非平台创作，待关联 | 正常显示，TikOmni找不到 |

### Case 4 来源说明
平台创作但点击"立即发布"或从待发布标记为已发布，TikOmni 同步时找不到（可能是绑定账号前发布的，或同步失败）

---

## 数据库设计

### Prisma 模型变更

```prisma
model Note {
  // ... 现有字段
  platformSource   String  @default("platform")  // "platform" | "external"
  syncStatus      String  @default("linked")    // "linked" | "pending_link" | "not_found"
}
```

#### 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| platformSource | String | "platform" | `platform`=平台创作，`external`=非平台创作 |
| syncStatus | String | "linked" | `linked`=已关联，`pending_link`=待关联，`not_found`=TikOmni有但本地无 |

---

## API 设计

### POST /api/sync 变更

#### 请求
```json
{
  "accountIds": ["account_id_1"]
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "results": [
      { "accountId": "xxx", "success": true, "count": 10 }
    ],
    "stats": {
      "linked": 5,
      "pendingLink": 2,
      "externalNew": 3,
      "movedToPublished": 1
    }
  }
}
```

---

## 前端设计

### 笔记库列表 Badge 显示

| 标签 | Badge 样式 |
|------|-----------|
| 平台创作，已关联 | 绿色 |
| 非平台创作 | 蓝色 |
| 非平台创作，待关联 | 橙色 |

### 匹配逻辑

#### 标题匹配算法
```typescript
function isTitleMatch(title1: string, title2: string, maxDiff = 3): boolean {
  // 计算两个标题的差异字符数
  // 差异 ≤ maxDiff 返回 true
}
```

#### 匹配流程
1. 同步时获取 TikOmni 笔记列表
2. 获取本地已发布和待发布列表
3. 按标题匹配（允许 ≤3 字差异）
4. 根据匹配结果更新 `platformSource` 和 `syncStatus`

---

## 实现步骤

### Step 1: 数据库迁移
- 新增 `platformSource` 字段
- 新增 `syncStatus` 字段
- 执行 `npx prisma db push`

### Step 2: 同步逻辑重构
- 修改 `/api/sync/route.ts`
- 实现标题匹配算法
- 实现关联状态计算逻辑

### Step 3: 前端 UI 变更
- 在配图步骤增加"跳过配图"按钮
- 在笔记库列表显示对应 Badge
- 处理无图笔记的显示

### Step 4: 测试验证
- 测试四种 Case 的同步流程
- 测试无图笔记的创建和发布
- 测试前端 Badge 显示

---

## 文件变更清单

| 文件 | 变更类型 |
|------|---------|
| `prisma/schema.prisma` | 修改 |
| `src/app/api/sync/route.ts` | 修改 |
| `src/app/(dashboard)/create/page.tsx` | 修改 |
| `src/app/(dashboard)/drafts/page.tsx` | 修改 |
| `src/types/index.ts` | 修改（Note 类型） |
