---
name: aigc-image-prompt
description: 根据小红书笔记标题和内容，使用 awesome-gpt-image-2 模板库生成 GPT-Image2 结构化配图提示词，固定 3:4 竖版
---

# AI 配图生成提示词 Skill (powered by awesome-gpt-image-2)

基于 [freestylefly/awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2) 风格库，将小红书笔记标题和内容转为结构化 GPT-Image2 提示词。固定输出 3:4 竖版配图。

## 输入

- 笔记标题
- 笔记内容（正文）

## 核心约束

1. **尺寸**：强制 3:4 竖版（aspect ratio 3:4），适配小红书信息流
2. **输入**：仅使用标题 + 正文内容，不依赖额外标签
3. **输出**：结构化提示词，包含 subject、composition、style、lighting、background、technical

## 模板选择规则

根据笔记内容类型匹配 awesome-gpt-image-2 模板：

| 内容类型 | 推荐模板 | 适用场景 |
|---------|---------|---------|
| 教程/方法/步骤 | `infographic-engine` | 步骤说明、图解展示、知识卡片 |
| 盘点/排行/清单 | `poster-layout-system` | 清单封面、推荐合集 |
| 对比/测评 | `product-commerce-visual` | 产品对比、前后对比 |
| 数据/分析/报告 | `personalized-beauty-report` | 数据展示、报告卡片 |
| 开箱/探店/日常 | `scene-storytelling` | 生活记录、真实场景 |
| 情感/故事/观点 | `conceptual-typography-poster` | 情绪表达、文字视觉 |
| 美妆/穿搭/时尚 | `product-commerce-visual` | 商品主图、搭配展示 |
| 知识/科普/干货 | `nature-science-poster` | 科普海报、知识卡片 |
| 美食/家居 | `realistic-photography` | 真实摄影质感 |

## 提示词组合格式

按以下结构化块组合提示词：

```
1. subject — 主体描述（基于笔记标题和内容的视觉主体）
2. composition — 构图要求（竖版 3:4，布局规则）
3. visual style — 视觉风格（匹配模板风格）
4. lighting — 光线描述
5. background — 背景和环境
6. technical — 技术参数（高质量渲染，专业质感）
7. constraints — 约束条件（避免的问题）
```

## 输出格式

```json
{
  "prompt": "完整的 GPT-Image2 提示词文本",
  "template": "选用的模板 ID",
  "params": {
    "size": "3:4",
    "quality": "high"
  }
}
```

## 参考

完整风格库参考：https://github.com/freestylefly/awesome-gpt-image-2
