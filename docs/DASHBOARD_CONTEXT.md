# Dashboard Metrics Update - Walkthrough

## Summary
Updated the Arbisense AI dashboard terminal to match the evaluation parameters and complexity from the Polymarket-Kalshi-Arbitrage-bot stress tests.

## Changes Made

### 1. TypeScript Types (`evaluation.ts`)
**New `StressTestScenario.results` fields:**
- `ev_cents`, `std_dev`, `skewness`, `kurtosis`: EV & distribution moments
- `var_90`, `var_95`, `var_99`, `var_999`: Extended VaR levels
- `cvar_95`, `cvar_99`: Expected Shortfall
- `sortino_ratio`, `calmar_ratio`, `profit_factor`: Risk-adjusted returns
- `loss_rate`, `zero_rate`, `max_gain`: Trade rates
- `latency_p50_ms`, `latency_p95_ms`, `latency_p99_ms`: Latency percentiles

**New `StressTestSuite.categories`:**
- `adversarial_scenarios`: CorrelationSnap, GhostLiquidity, LatencyJitter, etc.
- `regime_spectrum`: Steady, Volatile, FlashCrash regime tests

**New `aggregate_metrics`:**
- `mean_ev_cents`, `mean_sharpe`, `mean_sortino`, `mean_calmar`, `mean_profit_factor`
- `mean_latency_p50_ms`, `var_99_worst`, `cvar_99_worst`

### 2. Dashboard Component (`StressTestDashboard.tsx`)
**Aggregate Metrics Section:**
- Split into 2 rows: Core Risk + Stress Test metrics
- Added 7 new `MetricBox` components (Mean EV, Sortino, Calmar, VaR/CVaR worst, Latency p50)

**Category Filters:**
- Added "Adversarial Tests" and "Regime Spectrum" buttons

**Expanded Scenario Details (4 sections):**
- **Results**: EV, Total Return, Sharpe, Sortino, Calmar, Profit Factor, Max DD, Max Gain
- **Rates & Risk**: Win/Loss/Zero rates, VaR 95/99%, CVaR 95/99%, Recovery
- **Latency & Distribution**: p50/p95/p99, Skewness, Kurtosis, Std Dev
- **Model Behavior**: (preserved) Agent Consensus, Kelly Position, MC Convergence, CI Width

## Validation
- [x] TypeScript compilation: No new errors in modified files
- [x] Duplicate component synced: `components/evaluation/StressTestDashboard.tsx`