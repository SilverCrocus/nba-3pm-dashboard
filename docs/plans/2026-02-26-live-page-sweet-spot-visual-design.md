# Live Page: Sweet-Spot Visual Distinction

**Date:** 2026-02-26
**Status:** Approved

## Problem

The live tracking page shows all signals identically. Now that the user only bets on sweet-spot signals (5-15% edge), non-sweet-spot signals should be visually muted to make it clear which are actual bets vs tracking-only.

## Design

**Visual treatment for non-sweet-spot signals:**
1. `opacity-40` on the entire row (desktop `<tr>`, mobile card `<div>`)
2. Replace green edge % text with a muted "TRACKING ONLY" pill badge
3. Sort sweet-spot signals first within each game card, then non-sweet-spot below

**Files changed:**
- `GameCard.tsx` — sort signals, apply opacity + badge to non-sweet-spot rows
- `live/page.tsx` — same treatment for unmatched signals section

**No changes to:** types, hooks, LiveStatusBadge, CourtStatus, or LiveHeader.
