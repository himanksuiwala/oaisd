# Product context

## Objective

Help an electricity purchasing team understand the Elexon wind forecasts that were available when making day-ahead decisions in January 2026. This application analyzes forecasts; it does not recommend or execute electricity purchases.

## Phase 4 experience

- A trader selects a decision date from 1–31 January 2026 and a UTC cutoff time.
- Delivery is the following UTC calendar day, including 1 February for a 31 January decision.
- The default decision cutoff remains 15 January 2026 at 10:00 UTC.
- Source: Elexon `WINDFOR` hourly wind generation forecasts.
- A locally controlled comparison option, off by default, adds actual wind generation for the derived delivery day.
- Output: separate forecast, actual, and matched coverage; a dual-series profile chart; and one detailed row for every UTC delivery hour.
- The comparison is retrospective: actual generation was unavailable at the purchasing decision time.
- A successful comparison summarizes daily MAE, bias, and RMSE above the profile chart, with the shared matched-hour coverage and excluded-hour count.
- Metric values are calculated from unrounded hourly errors and displayed to one decimal place. Positive bias is marked with `+`; display-only negative zero is normalized to zero.

## Working assumptions

- Decision dates are restricted to January 2026.
- Delivery occurs on the following calendar day.
- All decision and delivery timestamps use UTC.
- The initial cutoff is 10:00 UTC. This is an assignment assumption, not a verified market deadline.
- Generation values represent MW.
- Missing generation must remain missing and must never be replaced with zero.
- The 24-hour publication lookback is a retrieval limit. Missing means no eligible record was found within that window; it does not prove that no older forecast exists.
- Hourly actual generation is the arithmetic mean of the documented FUELHH half-hour averages at H and H+30. Both readings are required; values are never summed, interpolated, or filled.
- Elexon does not document current hourly WINDFOR values as interval averages. Comparing the hourly forecast with the derived hourly FUELHH average is a project comparison convention, not a verified semantic equivalence.
- Signed error is forecast MW minus actual MW and is calculated only for matched valid hours.
- MAE is the mean absolute hourly error, bias is the mean signed hourly error, and RMSE is the square root of the mean squared hourly errors.
- All three metrics use the same matched hourly pairs. Missing and conflicting hours are excluded; genuine zero generation remains eligible.
- Metric coverage is complete for 24 matched hours, partial for 1–23, and unavailable for zero. With zero matched hours all metric values are null, never zero.

## Out of scope for Phase 4

- Month-wide analysis.
- Forecast bias correction.
- Confidence intervals or an accuracy percentage.
- Purchase recommendations or execution.
