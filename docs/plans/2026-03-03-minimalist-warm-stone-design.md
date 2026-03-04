# 簡約暖石板配色設計方案

**日期：** 2026-03-03
**目標：** 將現有 indigo 藍紫配色改為米白暖系簡約風格

## 設計原則

- 調性：米白暖系（Warm Stone），參考 Readwise、日系雜誌風格
- 模式：僅亮色模式（移除 dark mode）
- Accent：`orange-700` (#c2410c) 取代 `indigo-600`

## 色彩對照表

| 用途 | 舊值 | 新值 |
|------|------|------|
| 頁面背景 | `gray-50` | `stone-50` (#fafaf9) |
| 卡片底色 | `white` | `white` |
| 卡片邊框 | `gray-200` | `stone-200` (#e7e5e4) |
| 主要標題 | `gray-900` | `stone-900` (#1c1917) |
| 次要文字 | `gray-500/400` | `stone-500/400` |
| 中性背景 | `gray-100` | `stone-100` |
| Accent（按鈕/選中/連結） | `indigo-600` | `orange-700` (#c2410c) |
| Accent hover | `indigo-700` | `orange-800` |
| Accent light | `indigo-100` | `orange-100` |
| Accent text on light | `indigo-600` | `orange-700` |
| 閃卡背面背景 | `indigo-600` | `stone-800` (#292524) |
| 閃卡背面次要文字 | `indigo-200` | `stone-300` |
| 進度條（Review） | `indigo-500` | `stone-800` |
| Focus ring | `indigo-400` | `orange-400` |
| 功能性顏色（成功/危險） | 不變 | 保留 emerald / red |

## 受影響檔案

1. `app/globals.css` — 移除 dark mode，更新基礎樣式
2. `app/layout.tsx` — 背景改 `bg-stone-50`
3. `components/Navbar.tsx` — logo、active pill、hover 改色
4. `components/StatsCard.tsx` — highlight 卡改 orange-700
5. `components/VocabCard.tsx` — 中文翻譯、hover 改色
6. `components/FlashCard.tsx` — 閃卡背面、進度條改色
7. `components/CategoryBar.tsx` — 標題文字改 stone
8. `app/page.tsx` — 主按鈕、文字連結改色
9. `app/vocabulary/page.tsx` — 新增按鈕、過濾 pill、focus ring 改色
10. `app/review/page.tsx` — 進度條、按鈕、連結改色
11. `app/vocabulary/new/page.tsx` — 按鈕、focus ring 改色（如有）
12. `app/vocabulary/[id]/page.tsx` — 按鈕、focus ring 改色（如有）
