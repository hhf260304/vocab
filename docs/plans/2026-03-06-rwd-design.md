# RWD Design: Targeted Mobile Fixes

## Overview

The app uses a `max-w-3xl mx-auto px-4` centered narrow-column layout that works well on all screen sizes. The goal is to keep this layout unchanged and only fix the specific components that overflow or become cramped on small mobile screens (320–375px).

## Approach

Approach A: Targeted fixes — minimal, surgical Tailwind class changes to four problem areas. No layout restructuring, no new breakpoints at the page level.

## Components to Fix

### 1. Navbar (`components/Navbar.tsx`)

**Problem:** On very narrow screens, the logo text could be pushed or truncated by the right-side user info section.

**Fix:**
- Add `min-w-0 truncate` to the logo `<Link>` to prevent overflow
- Add `shrink-0` to the right `<div>` to prevent it from being compressed

### 2. VocabCard (`components/VocabCard.tsx`)

**Problem:** The outer `flex items-center justify-between` puts word text and Edit/Delete buttons on the same row. On 320px screens with long words, the buttons get squeezed.

**Fix:**
- Change outer container to `flex flex-col sm:flex-row sm:items-center`
- Button group gets `self-end sm:self-auto` so on mobile it sits at the bottom-right

### 3. CategorySection header (`app/languages/[id]/LanguageClient.tsx`)

**Problem:** The header row contains: `[name + count + arrow trigger] [+ 单字 button] [× button]`. On ~360px screens these compete for space.

**Fix:**
- Add `min-w-0` to `CollapsibleTrigger` so it can shrink properly
- Add `shrink-0` to the button group `<div>` so buttons never compress
- Reduce button group gap from `gap-2` to `gap-1.5`

### 4. Add-category form (`app/languages/[id]/LanguageClient.tsx`)

**Problem:** The `flex gap-2` row with Input + "建立" button + "取消" button is tight on 375px.

**Fix:**
- Input already has `flex-1` — keep it
- Add `shrink-0` to both buttons
- Shorten "取消" button to just show an X icon or keep text but ensure `shrink-0` prevents layout collapse

## What Is Not Changed

- Page-level containers (`max-w-3xl mx-auto px-4 py-8`) — unchanged
- FlashCard — already `w-full max-w-sm`, works on all sizes
- ReviewClient — single-column centered, works fine
- VocabForm — single-column form, works fine
- Home page language list — single-column `flex flex-col`, works fine
- Stats grid (`grid-cols-3`) — three fixed columns, wide enough on mobile

## Breakpoints Used

Only `sm:` (640px) breakpoint is introduced, applied to VocabCard's flex direction. All other fixes use sizing/overflow utilities that work at all sizes.
