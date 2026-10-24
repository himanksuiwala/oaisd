# Progress

## Phase 1

- [x] Inspect the existing backend and frontend structure, dependencies, API conventions, and test setup.
- [x] Verify the official Elexon `WINDFOR` contract and inspect the relevant January 2026 records.
- [x] Implement backend fetching and latest-eligible-publication selection.
- [x] Define missing-hour and deterministic duplicate behavior.
- [x] Add the fixed-scenario API and focused backend tests.
- [x] Build the Chakra UI forecast table and explicit loading/error/empty/missing states.
- [x] Complete automated checks and live end-to-end review.

## Verified source observations

- `WINDFOR` records expose `dataset`, `publishTime`, `startTime`, and `generation`.
- Forecast targets for this scenario are hourly.
- The inspected 24-hour publication window contains eight publication batches and 584 total records.
- For all 24 delivery hours on 16 January, the latest eligible publication before the 10:00 UTC cutoff is 15 January 2026 at 09:30 UTC.
- No duplicate `(startTime, publishTime)` keys occurred in the inspected records.

## Completed checks

- Backend: `4 passed` with pytest, covering cutoff selection, missing hours, identical/conflicting duplicates, the route response, and upstream failure handling.
- Frontend: TypeScript/Vite production build passed.
- Frontend: Oxlint passed without warnings.
- Live backend: Elexon returned 584 source records; the selector returned 24 of 24 hourly values.
- Browser journey: the page loaded through the existing Vite-to-FastAPI connection and displayed all 24 hours, including 7,472 MW at 00:00, 7,802 MW at 12:00, and 10,566 MW at 23:00. Each selected publication was 15 January 2026 at 09:30 UTC.

## Phase 2

- [x] Generalize the API for January decision dates and UTC cutoff times while preserving defaults.
- [x] Add strict HTTP 422 validation and next-calendar-day delivery derivation.
- [x] Return coverage and 24-hour retrieval-window metadata.
- [x] Add draft scenario controls and stale-response protection.
- [x] Add a Recharts forecast profile with gaps for missing/conflicting hours.
- [x] Preserve the detailed table and explicit loading/error/empty/partial/conflict states.
- [x] Extend backend tests for boundaries, validation, dynamic cutoff selection, coverage, and regressions.
- [x] Complete live January 1, January 15, and January 31 journey review.

## Phase 2 verification

- Backend: `8 passed` with pytest. Coverage includes default compatibility, January boundaries, exact input validation, next-day derivation, cutoff-dependent selection, 24-hour enumeration, missing/conflicting duplicates, coverage totals, and upstream HTTP 502 handling.
- Frontend: Oxlint passed without warnings.
- Frontend: TypeScript and the Vite production build passed. Vite reports that the Recharts-containing bundle is larger than its 500 kB advisory threshold.
- Live January 1 at 10:00 UTC: delivery mapped to January 2 with 24 available hours.
- Live January 15 at 10:00 UTC: delivery mapped to January 16 with 24 available hours; the default scenario remains unchanged.
- Live January 31 at 10:00 UTC: delivery mapped to February 1 with 24 available hours.
- Live cutoff comparison on January 15: 08:00 selected the 07:30 publication and 7,398 MW for the first hour; 10:00 selected the 09:30 publication and 7,472 MW. Every selected publication was at or before its applied cutoff.
- Browser: controls, applied scenario, coverage, chart, and table were reviewed for all three boundary/default dates.
- Browser request race: January 1 and January 31 were applied consecutively before the first request completed; only the January 31 cutoff and February 1 delivery result was displayed.

## Phase 3

- [x] Verify the official FUELHH contract, units, half-hour semantics, boundaries, and representative records.
- [x] Document the forecast/actual semantic limitation and explicit hourly averaging convention.
- [x] Add FUELHH retrieval, local WIND/day filtering, duplicate handling, and exact half-hour enumeration.
- [x] Add `GET /api/wind-comparison` with 24 aligned rows and separate coverage.
- [x] Preserve `GET /api/wind-forecast` behavior and forecast selection reuse.
- [x] Add the optional retrospective comparison UI, dual-series chart, source-reading details, and signed errors.
- [x] Preserve forecast usability and retry when actual retrieval fails.
- [x] Add focused backend comparison and regression tests.
- [x] Complete live comparison review for January 1, January 15, and January 31 decisions.

## Phase 3 verification

- Backend: `18 passed` with pytest, including all Phase 1/2 forecast regressions and the Phase 3 averaging, signed error, genuine-zero, missing/conflict, duplicate, filtering, 23:00 alignment, February delivery, matched coverage, and actual-upstream failure cases.
- Frontend: Oxlint passed without warnings.
- Frontend: TypeScript and Vite production build passed. The existing Recharts bundle-size advisory remains; the minified JavaScript bundle is approximately 888 kB before gzip.
- Live January 1 decision: January 2 delivery returned 24 forecast, 24 actual, and 24 matched hours. The first hourly actual was `(15,228 + 15,505) / 2 = 15,366.5 MW`; error was `18,699 − 15,366.5 = +3,332.5 MW`.
- Live January 15 decision: January 16 delivery returned 24/24/24 coverage. The first hourly actual was `(7,477 + 7,194) / 2 = 7,335.5 MW`; error was `+136.5 MW`.
- Live January 31 decision: February 1 delivery returned 24/24/24 coverage. The 23:00 row used the 23:00 and 23:30 readings, averaged to 5,216 MW, and produced `−209 MW` error.
- All three responses contained exactly 24 rows; every selected forecast publication was at or before its applied cutoff, and every non-null error matched forecast minus actual.
- Browser: forecast and actual chart series, coverage, signed errors, publication provenance, and accessible half-hour disclosures agreed with the API for all three scenarios.
- Browser race: disabling comparison immediately after applying a new scenario aborted/ignored the comparison request and displayed only the correct new forecast result.

## Phase 4 handoff

Calculate daily MAE, RMSE, and bias from matched hourly rows only. Keep coverage and unmatched-hour counts beside every metric so missing data cannot be mistaken for accuracy.
