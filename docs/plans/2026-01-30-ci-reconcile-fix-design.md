# CI Reconcile Fix Design

**Date:** 2026-01-30
**Status:** Implemented (2026-02-10)
**Repo:** SilverCrocus/nba-3pm-model

## Problem Statement

The `daily-signals.yml` workflow fails because `reconcile_outcomes()` assumes local data files exist:
- `paper_trades.parquet` - trades are actually in Supabase only in CI
- `player_games.parquet` - 50MB+ file on local machine from `NBA_PRA` project

### Goals
1. Make reconcile work in CI without requiring local data files
2. Keep local development working
3. Minimal code changes
4. No data duplication

### Success Criteria
- `gh workflow run daily-signals.yml` completes successfully
- Pending trades in Supabase get reconciled with actual outcomes
- Dashboard shows updated data daily

## Solution Architecture

Add a Supabase-first path for CI, while keeping the local path for development.

```
reconcile_outcomes()
       │
       ▼
  Is Supabase configured?
       │
      YES ──────────────────► CI PATH
       │                      1. Fetch pending from Supabase
       │                      2. Fetch game results from NBA API
       │                      3. Reconcile in-memory
       │                      4. Update Supabase directly
       │
      NO ───────────────────► LOCAL PATH (existing logic)
```

### Key Insight
CI only needs game results for specific dates with pending signals (1-5 dates). No need for the full historical dataset.

## Code Changes

### File 1: `src/data/game_results.py`

Add function to fetch game results for specific signals:

```python
def fetch_outcomes_for_signals(pending_signals: list[dict]) -> pd.DataFrame:
    """Fetch game outcomes for specific pending signals from NBA API.

    Args:
        pending_signals: List of dicts with 'player_name', 'signal_date'

    Returns:
        DataFrame with player_id, game_date, fg3_made columns
    """
    # Extract unique dates from pending signals
    # Fetch box scores for each date via NBA API
    # Filter to only the players we care about
    # Return minimal DataFrame for reconciliation
```

### File 2: `src/betting/paper_trader.py`

Add method to fetch pending signals from Supabase:

```python
def get_pending_from_supabase(self) -> pd.DataFrame:
    """Fetch pending (unreconciled) signals from Supabase."""
    client = get_supabase_client()
    result = client.table("paper_trades") \
        .select("*") \
        .is_("outcome", "null") \
        .execute()
    return pd.DataFrame(result.data)
```

### File 3: `scripts/run_paper_trading.py`

Modify `reconcile_outcomes()` to add CI path:

```python
def reconcile_outcomes(trader: PaperTrader, skip_refresh: bool = False) -> int:
    if is_supabase_configured():
        return _reconcile_from_supabase(trader)
    else:
        return _reconcile_from_local(trader, skip_refresh)

def _reconcile_from_supabase(trader: PaperTrader) -> int:
    """Reconcile using Supabase as source of truth."""
    # 1. Fetch pending signals from Supabase
    # 2. Call fetch_outcomes_for_signals() for those dates
    # 3. Reconcile in-memory
    # 4. Update Supabase directly with outcomes
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| No pending signals | Return early, exit 0 |
| NBA API rate limit | 2s delay between calls (existing) |
| Game not yet played | Skip signal (ET timezone check) |
| Player didn't play (DNP) | Mark as `voided` (checks `minutes == 0` in `game_results`) |
| NBA API down | Log warning, exit non-zero for retry |
| Supabase write fails | Retry once, then fail |

## Testing Strategy

### Local Testing
```bash
# Test CI path
export SUPABASE_URL="https://zrwelmnfbmfxseapwlhs.supabase.co"
export SUPABASE_KEY="your-key"
uv run pt reconcile

# Test local path
unset SUPABASE_URL SUPABASE_KEY
uv run pt reconcile
```

### Workflow Testing
```bash
gh workflow run daily-signals.yml --repo SilverCrocus/nba-3pm-model
gh run watch
```

## Implementation Plan

| # | File | Changes | Lines |
|---|------|---------|-------|
| 1 | `src/data/game_results.py` | Add `fetch_outcomes_for_signals()` | ~40 |
| 2 | `src/betting/paper_trader.py` | Add `get_pending_from_supabase()` | ~15 |
| 3 | `scripts/run_paper_trading.py` | Add CI path to `reconcile_outcomes()` | ~30 |

### Steps
1. Clone/navigate to `nba-3pm-model` repo
2. Create feature branch `fix/ci-reconcile`
3. Implement changes in order
4. Test locally with Supabase env vars
5. Push and trigger workflow
6. Verify dashboard updates
