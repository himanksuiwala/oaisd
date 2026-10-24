# Product context

## Objective

Help an electricity purchasing team understand the Elexon wind forecasts that were available when making day-ahead decisions in January 2026. This application analyzes forecasts; it does not recommend or execute electricity purchases.

## Phase 1 scenario

- Decision cutoff: 15 January 2026 at 10:00 UTC.
- Delivery day: 16 January 2026.
- Source: Elexon `WINDFOR` hourly wind generation forecasts.
- Output: one row for every UTC delivery hour, showing the target timestamp, forecast generation in MW, and selected publication timestamp.

## Working assumptions

- Decision dates are restricted to January 2026.
- Delivery occurs on the following calendar day.
- All decision and delivery timestamps use UTC.
- The initial cutoff is 10:00 UTC. This is an assignment assumption, not a verified market deadline.
- Generation values represent MW.
- Missing generation must remain missing and must never be replaced with zero.

## Out of scope for Phase 1

- Charts.
- Actual generation or `FUELHH` integration.
- Forecast accuracy metrics.
- Month-wide analysis.
- Purchase recommendations or execution.
