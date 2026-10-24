# Product context

## Objective

Help an electricity purchasing team understand the Elexon wind forecasts that were available when making day-ahead decisions in January 2026. This application analyzes forecasts; it does not recommend or execute electricity purchases.

## Phase 2 experience

- A trader selects a decision date from 1–31 January 2026 and a UTC cutoff time.
- Delivery is the following UTC calendar day, including 1 February for a 31 January decision.
- The default decision cutoff remains 15 January 2026 at 10:00 UTC.
- Source: Elexon `WINDFOR` hourly wind generation forecasts.
- Output: coverage, a forecast profile chart, and one table row for every UTC delivery hour.

## Working assumptions

- Decision dates are restricted to January 2026.
- Delivery occurs on the following calendar day.
- All decision and delivery timestamps use UTC.
- The initial cutoff is 10:00 UTC. This is an assignment assumption, not a verified market deadline.
- Generation values represent MW.
- Missing generation must remain missing and must never be replaced with zero.
- The 24-hour publication lookback is a retrieval limit. Missing means no eligible record was found within that window; it does not prove that no older forecast exists.

## Out of scope for Phase 2

- Actual generation or `FUELHH` integration.
- Forecast accuracy metrics.
- Month-wide analysis.
- Purchase recommendations or execution.
