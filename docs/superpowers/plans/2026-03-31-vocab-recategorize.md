# 單字分類重組 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 17 個分類重組為 11 個主題明確的分類，並正確歸位所有單字（含修正錯誤資料）

**Architecture:** 純 SQL 資料操作，透過 Neon MCP 工具執行。流程：新增分類 → 批次更新 category_id → 刪除空分類。所有操作皆使用 `mcp__Neon__run_sql`，projectId = `misty-surf-74967061`。

**Tech Stack:** Neon PostgreSQL（Drizzle ORM schema，直接操作資料庫）

**Key constants:**
- `language_id` (中文): `edcb1f08-2679-4c3e-89f3-72a7c06467bf`
- `user_id`: `894af6dd-8aa5-4a10-96fb-0c941cb33e77`

---

### Task 1: 確認執行前基準狀態

**Files:** 無（唯讀查詢）

- [ ] **Step 1: 查詢目前分類與單字數**

```sql
SELECT c.name, COUNT(v.id) as count
FROM categories c
LEFT JOIN vocabulary v ON v.category_id = c.id
WHERE c.language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
GROUP BY c.id, c.name
ORDER BY c.name;
```

Expected: 17 個分類，總單字數 290

- [ ] **Step 2: 確認 vocabulary 總數**

```sql
SELECT COUNT(*) FROM vocabulary;
```

Expected: 290（記下這個數字，結束後驗證一致）

---

### Task 2: 新增 5 個新分類

**Files:** 無（資料操作）

- [ ] **Step 1: 新增 人體相關、飲食、財經/金融、家居生活、日常生活**

```sql
INSERT INTO categories (id, user_id, language_id, name)
VALUES
  (gen_random_uuid(), '894af6dd-8aa5-4a10-96fb-0c941cb33e77', 'edcb1f08-2679-4c3e-89f3-72a7c06467bf', '人體相關'),
  (gen_random_uuid(), '894af6dd-8aa5-4a10-96fb-0c941cb33e77', 'edcb1f08-2679-4c3e-89f3-72a7c06467bf', '飲食'),
  (gen_random_uuid(), '894af6dd-8aa5-4a10-96fb-0c941cb33e77', 'edcb1f08-2679-4c3e-89f3-72a7c06467bf', '財經/金融'),
  (gen_random_uuid(), '894af6dd-8aa5-4a10-96fb-0c941cb33e77', 'edcb1f08-2679-4c3e-89f3-72a7c06467bf', '家居生活'),
  (gen_random_uuid(), '894af6dd-8aa5-4a10-96fb-0c941cb33e77', 'edcb1f08-2679-4c3e-89f3-72a7c06467bf', '日常生活');
```

Expected: INSERT 0 5

- [ ] **Step 2: 驗證新分類已建立**

```sql
SELECT id, name FROM categories
WHERE name IN ('人體相關', '飲食', '財經/金融', '家居生活', '日常生活')
  AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf';
```

Expected: 5 筆，各分類均有 id。**記下這 5 個 id，後續 Task 3–7 會用到。**

---

### Task 3: 移動單字到「人體相關」

合併來源：身體部位（`e871faf9-44ff-4c38-9bd9-b2b74e95377c`）、身體動作（`73c5966b-6931-45d6-9edb-6346431697bd`），加上未分類中的「剪指甲」。

- [ ] **Step 1: 移動身體部位 + 身體動作**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '人體相關'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id IN (
  'e871faf9-44ff-4c38-9bd9-b2b74e95377c',
  '73c5966b-6931-45d6-9edb-6346431697bd'
);
```

Expected: UPDATE 28（身體部位 20 + 身體動作 8）

- [ ] **Step 2: 移動未分類中的「剪指甲」**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '人體相關'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id = 'a15dc513-7f40-41d4-ae49-6d708d862bf3'
  AND chinese = '剪指甲';
```

Expected: UPDATE 1

- [ ] **Step 3: 驗證**

```sql
SELECT COUNT(*) FROM vocabulary
WHERE category_id = (
  SELECT id FROM categories WHERE name = '人體相關'
  AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
);
```

Expected: 29

---

### Task 4: 移動單字到「飲食」

合併來源：食物口味/口感（`239c5953-4b0e-4c1b-b7fe-03d1726c7963`）、食物調味料（`5da3bdfb-a391-44ac-b4f9-ab95d15723a8`），加上食物（`86beed85-29c3-425c-b7a6-0bc501466995`）中的「荷包蛋」。

**注意：食物中的「演員」不移到飲食，Task 7 另行處理。**

- [ ] **Step 1: 移動食物口味/口感 + 食物調味料**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '飲食'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id IN (
  '239c5953-4b0e-4c1b-b7fe-03d1726c7963',
  '5da3bdfb-a391-44ac-b4f9-ab95d15723a8'
);
```

Expected: UPDATE 35（食物口味/口感 19 + 食物調味料 16）

- [ ] **Step 2: 移動食物中的「荷包蛋」**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '飲食'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id = '86beed85-29c3-425c-b7a6-0bc501466995'
  AND chinese = '荷包蛋';
```

Expected: UPDATE 1

- [ ] **Step 3: 驗證**

```sql
SELECT COUNT(*) FROM vocabulary
WHERE category_id = (
  SELECT id FROM categories WHERE name = '飲食'
  AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
);
```

Expected: 36

---

### Task 5: 移動單字到「財經/金融」

合併來源：銀行相關（`65112bae-cc89-4d9d-80e1-eefc2f8979eb`）、財經/投資（`5d8b8505-50f3-41d8-9f80-412732de292b`）。

- [ ] **Step 1: 移動銀行相關 + 財經/投資**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '財經/金融'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id IN (
  '65112bae-cc89-4d9d-80e1-eefc2f8979eb',
  '5d8b8505-50f3-41d8-9f80-412732de292b'
);
```

Expected: UPDATE 52（銀行相關 49 + 財經/投資 3）

- [ ] **Step 2: 驗證**

```sql
SELECT COUNT(*) FROM vocabulary
WHERE category_id = (
  SELECT id FROM categories WHERE name = '財經/金融'
  AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
);
```

Expected: 52

---

### Task 6: 移動單字到「家居生活」

合併來源：家具（`99f2589b-06c6-442e-9af0-45f95f021cef`），加上未分類中的「電風扇」、「蓮蓬頭」。

- [ ] **Step 1: 移動家具**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '家居生活'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id = '99f2589b-06c6-442e-9af0-45f95f021cef';
```

Expected: UPDATE 18

- [ ] **Step 2: 移動未分類中的「電風扇」、「蓮蓬頭」**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '家居生活'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id = 'a15dc513-7f40-41d4-ae49-6d708d862bf3'
  AND chinese IN ('電風扇', '蓮蓬頭');
```

Expected: UPDATE 2

- [ ] **Step 3: 驗證**

```sql
SELECT COUNT(*) FROM vocabulary
WHERE category_id = (
  SELECT id FROM categories WHERE name = '家居生活'
  AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
);
```

Expected: 20

---

### Task 7: 移動單字到「日常生活」

來源：交通/出行（`affd5e1b-4734-4e09-906a-2bd85ffb7921`）、自然科學（`d9c7e640-a07e-43ed-bc5f-968cc81dc23b`），加上食物中的「演員」，加上未分類剩餘 9 字（回音、托眼鏡、撲克牌、橡皮筋、火災、貼紙、賄賂、金字塔 + 先前 Step 後未分類剩下的）。

- [ ] **Step 1: 移動交通/出行 + 自然科學**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '日常生活'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id IN (
  'affd5e1b-4734-4e09-906a-2bd85ffb7921',
  'd9c7e640-a07e-43ed-bc5f-968cc81dc23b'
);
```

Expected: UPDATE 6（交通/出行 3 + 自然科學 3）

- [ ] **Step 2: 移動食物中的「演員」（修正錯誤分類）**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '日常生活'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id = '86beed85-29c3-425c-b7a6-0bc501466995'
  AND chinese = '演員';
```

Expected: UPDATE 1

- [ ] **Step 3: 移動未分類剩餘 9 字到日常生活**

```sql
UPDATE vocabulary
SET category_id = (
  SELECT id FROM categories
  WHERE name = '日常生活'
    AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
)
WHERE category_id = 'a15dc513-7f40-41d4-ae49-6d708d862bf3'
  AND chinese IN ('回音', '托眼鏡', '撲克牌', '橡皮筋', '火災', '貼紙', '賄賂', '金字塔');
```

Expected: UPDATE 8

- [ ] **Step 4: 驗證**

```sql
SELECT COUNT(*) FROM vocabulary
WHERE category_id = (
  SELECT id FROM categories WHERE name = '日常生活'
  AND language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
);
```

Expected: 15

---

### Task 8: 移動單字到「情緒」

來源：未分類中的「體貼」、「優點」移入原有情緒分類（`34b04a27-b757-45a0-95cb-72706082eabd`）。

- [ ] **Step 1: 移動「體貼」、「優點」到情緒**

```sql
UPDATE vocabulary
SET category_id = '34b04a27-b757-45a0-95cb-72706082eabd'
WHERE category_id = 'a15dc513-7f40-41d4-ae49-6d708d862bf3'
  AND chinese IN ('體貼', '優點');
```

Expected: UPDATE 2

- [ ] **Step 2: 驗證情緒分類**

```sql
SELECT COUNT(*) FROM vocabulary
WHERE category_id = '34b04a27-b757-45a0-95cb-72706082eabd';
```

Expected: 22

---

### Task 9: 刪除空的舊分類

刪除已清空的 11 個舊分類。

- [ ] **Step 1: 先確認這些分類已經是空的**

```sql
SELECT c.name, COUNT(v.id) as count
FROM categories c
LEFT JOIN vocabulary v ON v.category_id = c.id
WHERE c.id IN (
  'e871faf9-44ff-4c38-9bd9-b2b74e95377c',
  '73c5966b-6931-45d6-9edb-6346431697bd',
  '239c5953-4b0e-4c1b-b7fe-03d1726c7963',
  '5da3bdfb-a391-44ac-b4f9-ab95d15723a8',
  '86beed85-29c3-425c-b7a6-0bc501466995',
  '65112bae-cc89-4d9d-80e1-eefc2f8979eb',
  '5d8b8505-50f3-41d8-9f80-412732de292b',
  '99f2589b-06c6-442e-9af0-45f95f021cef',
  'affd5e1b-4734-4e09-906a-2bd85ffb7921',
  'd9c7e640-a07e-43ed-bc5f-968cc81dc23b',
  'a15dc513-7f40-41d4-ae49-6d708d862bf3'
)
GROUP BY c.id, c.name;
```

Expected: 11 筆，每筆 count = 0。若有非 0，停止並排查。

- [ ] **Step 2: 刪除舊分類**

```sql
DELETE FROM categories
WHERE id IN (
  'e871faf9-44ff-4c38-9bd9-b2b74e95377c',
  '73c5966b-6931-45d6-9edb-6346431697bd',
  '239c5953-4b0e-4c1b-b7fe-03d1726c7963',
  '5da3bdfb-a391-44ac-b4f9-ab95d15723a8',
  '86beed85-29c3-425c-b7a6-0bc501466995',
  '65112bae-cc89-4d9d-80e1-eefc2f8979eb',
  '5d8b8505-50f3-41d8-9f80-412732de292b',
  '99f2589b-06c6-442e-9af0-45f95f021cef',
  'affd5e1b-4734-4e09-906a-2bd85ffb7921',
  'd9c7e640-a07e-43ed-bc5f-968cc81dc23b',
  'a15dc513-7f40-41d4-ae49-6d708d862bf3'
);
```

Expected: DELETE 11

---

### Task 10: 最終驗證

- [ ] **Step 1: 確認分類數量**

```sql
SELECT c.name, COUNT(v.id) as count
FROM categories c
LEFT JOIN vocabulary v ON v.category_id = c.id
WHERE c.language_id = 'edcb1f08-2679-4c3e-89f3-72a7c06467bf'
GROUP BY c.id, c.name
ORDER BY c.name;
```

Expected: 恰好 11 筆：
- 人體相關: 29
- 動物: 33
- 國家: 19
- 情緒: 22
- 日常生活: 15
- 家居生活: 20
- 衣物: 24
- 財經/金融: 52
- 飲食: 36
- 網路/電腦: 11
- 餐廳相關: 29

- [ ] **Step 2: 確認單字總數不變**

```sql
SELECT COUNT(*) FROM vocabulary;
```

Expected: 290（與 Task 1 記錄的數字一致）

- [ ] **Step 3: 確認沒有孤兒單字（category_id 為 null 或指向不存在分類）**

```sql
SELECT COUNT(*) FROM vocabulary v
LEFT JOIN categories c ON v.category_id = c.id
WHERE c.id IS NULL AND v.category_id IS NOT NULL;
```

Expected: 0
