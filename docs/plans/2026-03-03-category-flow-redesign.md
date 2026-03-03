# 分類流程調整設計文件

**日期：** 2026-03-03

## 目標

將分類管理從「新增/編輯單字頁面」移至「單字庫頁面」，讓用戶先在單字庫建立分類，再在分類內新增單字。

## 變更範圍

### 1. 單字庫頁面 (`app/vocabulary/page.tsx`)

- Header 右側：將「+ 新增單字」改為「+ 新增分類」按鈕
- 點擊後顯示 inline 輸入框，送出後建立分類
- 每個 `CategorySection` header 右側加入：
  - 「+ 單字」按鈕，連結 `/vocabulary/new?categoryId=xxx`
  - 刪除分類按鈕（× 圖示），點擊需 confirm 確認
- 無分類且無單字時：顯示「先新增分類，再加入單字」引導訊息

### 2. 新增單字頁面 (`app/vocabulary/new/page.tsx`)

- 從 URL query param 讀取 `categoryId`
- 傳入 `addVocabulary` 時設定 `categoryIds: categoryId ? [categoryId] : []`
- 頁面標題顯示所屬分類名稱（若有）

### 3. VocabForm (`components/VocabForm.tsx`)

- 移除整個分類區塊（選擇現有分類、新增分類輸入框、刪除分類按鈕）
- 移除相關 state：`newCatName`
- 移除相關 functions：`addCategoryToWord`、`removeCategoryFromWord`、`handleAddCategory`
- 移除 `useVocabStore` 中 `addCategory`、`deleteCategory` 的引用

### 4. 編輯單字頁面 (`app/vocabulary/[id]/page.tsx`)

- 無需改動頁面邏輯
- `VocabForm` 移除分類 UI 後，編輯時現有 `categoryIds` 靜默保留（不顯示、不可修改）

## 資料模型

無需變更。`Vocabulary.categoryIds` 與 `Category` 型別維持不變。

## 不在此次範圍

- 單字在分類間移動的功能
- 編輯頁面補回分類管理
