import type { ComparisonResponse, ForecastResponse, RangeResponse, RangeScenario, Scenario } from '../domain/windAnalysis.ts'

function scenarioQuery(scenario: Scenario) {
  return new URLSearchParams({
    decision_date: scenario.decisionDate,
    cutoff_time: scenario.cutoffTime,
  })
}

export async function fetchForecast(scenario: Scenario, signal: AbortSignal): Promise<ForecastResponse> {
  const response = await fetch(`/api/wind-forecast?${scenarioQuery(scenario)}`, { signal })
  if (!response.ok) throw new Error(`The forecast service returned HTTP ${response.status}.`)
  return (await response.json()) as ForecastResponse
}

export async function fetchComparison(scenario: Scenario, signal: AbortSignal): Promise<ComparisonResponse> {
  const response = await fetch(`/api/wind-comparison?${scenarioQuery(scenario)}`, { signal })
  if (!response.ok) throw new Error(`The comparison service returned HTTP ${response.status}.`)
  return (await response.json()) as ComparisonResponse
}

export async function fetchPeriodAccuracy(scenario: RangeScenario, signal: AbortSignal): Promise<RangeResponse> {
  const query = new URLSearchParams({
    decision_date_from: scenario.decisionDateFrom,
    decision_date_to: scenario.decisionDateTo,
    cutoff_time: scenario.cutoffTime,
  })
  const response = await fetch(`/api/wind-accuracy?${query}`, { signal })
  if (!response.ok) throw new Error(`The period analysis service returned HTTP ${response.status}.`)
  return (await response.json()) as RangeResponse
}
