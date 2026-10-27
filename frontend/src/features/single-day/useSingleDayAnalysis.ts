import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchComparison, fetchForecast } from '../../api/windAnalysisApi.ts'
import {
  DEFAULT_SCENARIO,
  type ComparisonState,
  type ForecastState,
  type Scenario,
} from '../../domain/windAnalysis.ts'

export function useSingleDayAnalysis() {
  const [selectedHourTarget, setSelectedHourTarget] = useState<string | null>(null)
  const [draft, setDraft] = useState<Scenario>(DEFAULT_SCENARIO)
  const [forecastState, setForecastState] = useState<ForecastState>({ status: 'loading', scenario: DEFAULT_SCENARIO })
  const [comparisonState, setComparisonState] = useState<ComparisonState>({ status: 'off' })
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [appliedScenario, setAppliedScenario] = useState<Scenario | null>(null)
  const compareEnabledRef = useRef(false)
  const scenarioVersion = useRef(0)
  const forecastRequest = useRef<{ id: number; controller: AbortController } | null>(null)
  const comparisonRequest = useRef<{ id: number; controller: AbortController } | null>(null)
  const nextForecastRequestId = useRef(0)
  const nextComparisonRequestId = useRef(0)

  const loadComparison = useCallback(async (scenario: Scenario, version: number) => {
    comparisonRequest.current?.controller.abort()
    const controller = new AbortController()
    const id = ++nextComparisonRequestId.current
    comparisonRequest.current = { id, controller }
    setComparisonState({ status: 'loading', scenario })
    try {
      const data = await fetchComparison(scenario, controller.signal)
      if (
        comparisonRequest.current?.id === id
        && scenarioVersion.current === version
        && compareEnabledRef.current
      ) {
        setComparisonState({ status: 'success', data })
      }
    } catch (error) {
      if (controller.signal.aborted || comparisonRequest.current?.id !== id || scenarioVersion.current !== version) return
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      setComparisonState({ status: 'error', scenario, message })
    }
  }, [])

  const loadScenario = useCallback(async (scenario: Scenario, includeComparison: boolean) => {
    forecastRequest.current?.controller.abort()
    comparisonRequest.current?.controller.abort()
    const version = ++scenarioVersion.current
    const controller = new AbortController()
    const id = ++nextForecastRequestId.current
    forecastRequest.current = { id, controller }
    setAppliedScenario(null)
    setForecastState({ status: 'loading', scenario })
    if (includeComparison) void loadComparison(scenario, version)
    else setComparisonState({ status: 'off' })

    try {
      const data = await fetchForecast(scenario, controller.signal)
      if (forecastRequest.current?.id === id && scenarioVersion.current === version) {
        setAppliedScenario(scenario)
        setForecastState({ status: 'success', data })
      }
    } catch (error) {
      if (controller.signal.aborted || forecastRequest.current?.id !== id || scenarioVersion.current !== version) return
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      setForecastState({ status: 'error', scenario, message })
    }
  }, [loadComparison])

  useEffect(() => {
    const version = ++scenarioVersion.current
    const controller = new AbortController()
    const id = ++nextForecastRequestId.current
    forecastRequest.current = { id, controller }
    void fetchForecast(DEFAULT_SCENARIO, controller.signal)
      .then((data) => {
        if (forecastRequest.current?.id === id && scenarioVersion.current === version) {
          setAppliedScenario(DEFAULT_SCENARIO)
          setForecastState({ status: 'success', data })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || forecastRequest.current?.id !== id) return
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
        setForecastState({ status: 'error', scenario: DEFAULT_SCENARIO, message })
      })
    return () => {
      controller.abort()
      comparisonRequest.current?.controller.abort()
    }
  }, [])

  function applyDraft() {
    void loadScenario({ ...draft }, compareEnabledRef.current)
  }

  function retryForecast() {
    if (forecastState.status === 'error') {
      void loadScenario(forecastState.scenario, compareEnabledRef.current)
    }
  }

  function retryComparison() {
    if (comparisonState.status === 'error') {
      void loadComparison(comparisonState.scenario, scenarioVersion.current)
    }
  }

  function toggleComparison(checked: boolean) {
    compareEnabledRef.current = checked
    setCompareEnabled(checked)
    if (!checked) {
      comparisonRequest.current?.controller.abort()
      nextComparisonRequestId.current += 1
      setComparisonState({ status: 'off' })
      return
    }
    const scenario = appliedScenario
      ?? (forecastState.status === 'loading' ? forecastState.scenario : null)
    if (scenario) void loadComparison(scenario, scenarioVersion.current)
  }

  const comparisonData = compareEnabled && comparisonState.status === 'success'
    ? comparisonState.data
    : null

  const selectedForecastHour = forecastState.status === 'success'
    ? forecastState.data.hours.find((hour) => hour.target_time === selectedHourTarget) ?? forecastState.data.hours[0]
    : null

  const selectedComparisonHour = comparisonData && selectedForecastHour
    ? comparisonData.hours.find((hour) => hour.target_time === selectedForecastHour.target_time)
    : undefined

  return {
    applyDraft,
    compareEnabled,
    comparisonData,
    comparisonState,
    draft,
    forecastState,
    retryComparison,
    retryForecast,
    selectedComparisonHour,
    selectedForecastHour,
    setDraft,
    setSelectedHourTarget,
    toggleComparison,
  }
}
