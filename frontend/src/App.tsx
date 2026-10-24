import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Field,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Switch,
  Table,
  Text,
} from '@chakra-ui/react'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { ForecastChart } from './ForecastChart.tsx'

type DataStatus = 'available' | 'missing' | 'conflict'

type ForecastHour = {
  target_time: string
  generation_mw: number | null
  publish_time: string | null
  status: DataStatus
}

type Coverage = {
  expected_hours: 24
  available_hours: number
  missing_hours: number
  conflicting_hours: number
}

type ForecastResponse = {
  decision_time: string
  delivery_date: string
  unit: 'MW'
  source: 'Elexon WINDFOR'
  source_record_count: number
  retrieval_lookback_hours: 24
  coverage: Coverage
  hours: ForecastHour[]
}

type ActualReading = {
  target_time: string
  generation_mw: number | null
  publish_time: string | null
  status: DataStatus
}

type ComparisonHour = {
  target_time: string
  forecast_mw: number | null
  forecast_publish_time: string | null
  forecast_status: DataStatus
  actual_readings: ActualReading[]
  actual_mw: number | null
  actual_status: DataStatus
  error_mw: number | null
}

type ComparisonResponse = {
  decision_time: string
  delivery_date: string
  unit: 'MW'
  forecast_source: 'Elexon WINDFOR'
  actual_source: 'Elexon FUELHH'
  forecast_source_record_count: number
  actual_source_record_count: number
  retrieval_lookback_hours: 24
  actual_retrieved_at: string
  alignment_policy: 'mean_of_two_half_hourly_average_mw'
  coverage: {
    forecast: Coverage
    actual: Coverage
    matched: {
      expected_hours: 24
      matched_hours: number
      unmatched_hours: number
    }
  }
  accuracy: {
    mae_mw: number | null
    bias_mw: number | null
    rmse_mw: number | null
    matched_hours: number
    expected_hours: 24
    unmatched_hours: number
    coverage_status: 'complete' | 'partial' | 'unavailable'
  }
  hours: ComparisonHour[]
}

type Scenario = {
  decisionDate: string
  cutoffTime: string
}

type ForecastState =
  | { status: 'loading'; scenario: Scenario }
  | { status: 'error'; scenario: Scenario; message: string }
  | { status: 'success'; data: ForecastResponse }

type ComparisonState =
  | { status: 'off' }
  | { status: 'loading'; scenario: Scenario }
  | { status: 'error'; scenario: Scenario; message: string }
  | { status: 'success'; data: ComparisonResponse }

const DEFAULT_SCENARIO: Scenario = {
  decisionDate: '2026-01-15',
  cutoffTime: '10:00',
}

const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

function formatTimestamp(value: string) {
  return `${timestampFormatter.format(new Date(value))} UTC`
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}

function formatMw(value: number | null) {
  return value === null ? null : value.toLocaleString('en-GB', { maximumFractionDigits: 1 })
}

function formatError(value: number | null) {
  if (value === null) return null
  if (value === 0) return '0'
  const magnitude = Math.abs(value).toLocaleString('en-GB', { maximumFractionDigits: 1 })
  return value > 0 ? `+${magnitude}` : `−${magnitude}`
}

function formatMetric(value: number | null, signed = false) {
  if (value === null) return 'Unavailable'
  const rounded = Math.round(value * 10) / 10
  const normalized = Object.is(rounded, -0) ? 0 : rounded
  const formatted = Math.abs(normalized).toLocaleString('en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  if (!signed || normalized === 0) return `${formatted} MW`
  return `${normalized > 0 ? '+' : '−'}${formatted} MW`
}

function statusBadge(status: DataStatus) {
  return (
    <Badge colorPalette={status === 'conflict' ? 'orange' : 'gray'}>
      {status === 'conflict' ? 'Data conflict' : 'Unavailable'}
    </Badge>
  )
}

function scenarioQuery(scenario: Scenario) {
  return new URLSearchParams({
    decision_date: scenario.decisionDate,
    cutoff_time: scenario.cutoffTime,
  })
}

async function fetchForecast(scenario: Scenario, signal: AbortSignal): Promise<ForecastResponse> {
  const response = await fetch(`/api/wind-forecast?${scenarioQuery(scenario)}`, { signal })
  if (!response.ok) throw new Error(`The forecast service returned HTTP ${response.status}.`)
  return (await response.json()) as ForecastResponse
}

async function fetchComparison(scenario: Scenario, signal: AbortSignal): Promise<ComparisonResponse> {
  const response = await fetch(`/api/wind-comparison?${scenarioQuery(scenario)}`, { signal })
  if (!response.ok) throw new Error(`The comparison service returned HTTP ${response.status}.`)
  return (await response.json()) as ComparisonResponse
}

function ForecastTable({ hours }: { hours: ForecastHour[] }) {
  return (
    <Table.ScrollArea borderWidth="1px" borderColor="border.subtle" rounded="lg">
      <Table.Root minW="720px" size={{ base: 'sm', md: 'md' }}>
        <Table.Header bg="bg.subtle">
          <Table.Row>
            <Table.ColumnHeader>Target timestamp</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Forecast generation (MW)</Table.ColumnHeader>
            <Table.ColumnHeader>Selected publication timestamp</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {hours.map((hour) => (
            <Table.Row key={hour.target_time}>
              <Table.Cell whiteSpace="nowrap">{formatTimestamp(hour.target_time)}</Table.Cell>
              <Table.Cell textAlign="end" fontWeight="semibold">
                {hour.status === 'available' ? formatMw(hour.generation_mw) : statusBadge(hour.status)}
              </Table.Cell>
              <Table.Cell whiteSpace="nowrap">
                {hour.publish_time ? formatTimestamp(hour.publish_time) : 'Not available'}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}

function ComparisonTable({ hours }: { hours: ComparisonHour[] }) {
  return (
    <Table.ScrollArea borderWidth="1px" borderColor="border.subtle" rounded="lg">
      <Table.Root minW="1050px" size={{ base: 'sm', md: 'md' }}>
        <Table.Header bg="bg.subtle">
          <Table.Row>
            <Table.ColumnHeader>Target timestamp</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Forecast (MW)</Table.ColumnHeader>
            <Table.ColumnHeader>Forecast publication</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Hourly actual (MW)</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Error (MW)</Table.ColumnHeader>
            <Table.ColumnHeader>Actual source readings</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {hours.map((hour) => (
            <Table.Row key={hour.target_time}>
              <Table.Cell whiteSpace="nowrap">{formatTimestamp(hour.target_time)}</Table.Cell>
              <Table.Cell textAlign="end" fontWeight="semibold">
                {hour.forecast_status === 'available' ? formatMw(hour.forecast_mw) : statusBadge(hour.forecast_status)}
              </Table.Cell>
              <Table.Cell whiteSpace="nowrap">
                {hour.forecast_publish_time ? formatTimestamp(hour.forecast_publish_time) : 'Not available'}
              </Table.Cell>
              <Table.Cell textAlign="end" fontWeight="semibold">
                {hour.actual_status === 'available' ? formatMw(hour.actual_mw) : statusBadge(hour.actual_status)}
              </Table.Cell>
              <Table.Cell textAlign="end" fontWeight="semibold">
                {hour.error_mw === null ? 'Not available' : formatError(hour.error_mw)}
              </Table.Cell>
              <Table.Cell>
                <details>
                  <summary>View half-hours</summary>
                  <Stack gap="2" mt="2" minW="260px">
                    {hour.actual_readings.map((reading) => (
                      <Box key={reading.target_time}>
                        <Text fontSize="sm">{formatTimestamp(reading.target_time)}</Text>
                        <Text color="fg.muted" fontSize="sm">
                          {reading.status === 'available' ? `${formatMw(reading.generation_mw)} MW` : reading.status}
                          {' · Published '}
                          {reading.publish_time ? formatTimestamp(reading.publish_time) : 'not available'}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </details>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}

function ForecastCoverage({ coverage }: { coverage: Coverage }) {
  const items = [
    { label: 'Available', value: coverage.available_hours, color: 'green' },
    { label: 'Missing', value: coverage.missing_hours, color: 'gray' },
    { label: 'Conflicting', value: coverage.conflicting_hours, color: 'orange' },
  ]
  return (
    <SimpleGrid columns={{ base: 1, sm: 3 }} gap="3" aria-label="Forecast coverage">
      {items.map((item) => (
        <Flex key={item.label} bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="md" p="4" justify="space-between" align="center">
          <Text color="fg.muted">{item.label}</Text>
          <Badge colorPalette={item.color} size="lg">{item.value} hours</Badge>
        </Flex>
      ))}
    </SimpleGrid>
  )
}

function ComparisonCoverage({ data }: { data: ComparisonResponse }) {
  const items = [
    { label: 'Forecast available', value: data.coverage.forecast.available_hours, color: 'blue' },
    { label: 'Actual available', value: data.coverage.actual.available_hours, color: 'teal' },
    { label: 'Matched', value: data.coverage.matched.matched_hours, color: 'green' },
  ]
  return (
    <SimpleGrid columns={{ base: 1, sm: 3 }} gap="3" aria-label="Comparison coverage">
      {items.map((item) => (
        <Flex key={item.label} bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="md" p="4" justify="space-between" align="center">
          <Text color="fg.muted">{item.label}</Text>
          <Badge colorPalette={item.color} size="lg">{item.value} / 24</Badge>
        </Flex>
      ))}
    </SimpleGrid>
  )
}

function AccuracySummary({ accuracy }: { accuracy: ComparisonResponse['accuracy'] }) {
  const metrics = [
    { label: 'MAE', value: accuracy.mae_mw, description: 'Average size of the hourly error.', signed: false },
    { label: 'Bias', value: accuracy.bias_mw, description: 'Average overestimate (+) or underestimate (−).', signed: true },
    { label: 'RMSE', value: accuracy.rmse_mw, description: 'Gives larger errors more weight.', signed: false },
  ]
  const statusLabel = accuracy.coverage_status === 'complete'
    ? 'Complete coverage'
    : accuracy.coverage_status === 'partial'
      ? 'Partial coverage'
      : 'Unavailable'

  return (
    <Stack as="section" aria-labelledby="accuracy-title" gap="3">
      <Box>
        <Heading as="h2" id="accuracy-title" size="xl">Daily forecast accuracy</Heading>
        <Text color="fg.muted" mt="1">Based on {accuracy.matched_hours} of 24 hours; {accuracy.unmatched_hours} hours excluded.</Text>
      </Box>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="3">
        {metrics.map((metric) => (
          <Box key={metric.label} bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="lg" p="5">
            <Text color="fg.muted" fontSize="sm" fontWeight="medium">{metric.label}</Text>
            <Text fontSize="2xl" fontWeight="bold" mt="1">{formatMetric(metric.value, metric.signed)}</Text>
            <Text color="fg.muted" fontSize="sm" mt="2">{metric.description}</Text>
          </Box>
        ))}
        <Box bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="lg" p="5">
          <Text color="fg.muted" fontSize="sm" fontWeight="medium">Coverage</Text>
          <Badge
            colorPalette={accuracy.coverage_status === 'complete' ? 'green' : accuracy.coverage_status === 'partial' ? 'orange' : 'gray'}
            mt="2"
            size="lg"
          >
            {statusLabel}
          </Badge>
          <Text color="fg.muted" fontSize="sm" mt="3">
            {accuracy.coverage_status === 'complete'
              ? 'All expected delivery hours are included.'
              : accuracy.coverage_status === 'partial'
                ? 'Metrics describe matched hours only.'
                : 'No valid forecast-actual pairs exist.'}
          </Text>
        </Box>
      </SimpleGrid>
      <Text color="fg.muted" fontSize="sm">
        Methodology: metrics use matched hourly pairs. Hourly actual MW averages the two half-hour readings. WINDFOR interval-average semantics are unverified, so this alignment is a project convention. Missing and conflicting hours are excluded.
      </Text>
    </Stack>
  )
}

export function App() {
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

  function applyScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadScenario({ ...draft }, compareEnabledRef.current)
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

  return (
    <Box minH="100vh" bg="bg.subtle" py={{ base: 8, md: 14 }}>
      <Container maxW="6xl">
        <Stack gap={{ base: 6, md: 8 }}>
          <Stack gap="3">
            <Text color="fg.muted" fontWeight="medium" letterSpacing="wide" textTransform="uppercase">Day-ahead forecast review</Text>
            <Heading as="h1" size={{ base: '3xl', md: '4xl' }} letterSpacing="tight">Compare wind forecast with actual generation</Heading>
            <Text color="fg.muted" maxW="3xl" fontSize={{ base: 'md', md: 'lg' }}>
              Choose a UTC decision cutoff to inspect the forecast available then and, optionally, compare it with actual generation on the following delivery day.
            </Text>
          </Stack>

          <form onSubmit={applyScenario}>
            <Box bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="lg" p={{ base: 5, md: 6 }}>
              <Stack gap="5">
                <Stack direction={{ base: 'column', md: 'row' }} gap="4" align={{ md: 'end' }}>
                  <Field.Root required flex="1">
                    <Field.Label>Decision date</Field.Label>
                    <Input type="date" min="2026-01-01" max="2026-01-31" value={draft.decisionDate} onChange={(event) => setDraft((current) => ({ ...current, decisionDate: event.target.value }))} />
                  </Field.Root>
                  <Field.Root required flex="1">
                    <Field.Label>Cutoff time (UTC)</Field.Label>
                    <Input type="time" value={draft.cutoffTime} onChange={(event) => setDraft((current) => ({ ...current, cutoffTime: event.target.value }))} />
                  </Field.Root>
                  <Button type="submit" colorPalette="blue" minW={{ md: '28' }}>Apply</Button>
                </Stack>
                <Switch.Root checked={compareEnabled} onCheckedChange={(details) => toggleComparison(details.checked)}>
                  <Switch.HiddenInput />
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                  <Switch.Label>Compare with actuals</Switch.Label>
                </Switch.Root>
              </Stack>
            </Box>
          </form>

          {forecastState.status === 'loading' && (
            <Stack role="status" aria-live="polite" direction="row" gap="3" py="12" justify="center" align="center">
              <Spinner size="sm" />
              <Text>Loading {forecastState.scenario.decisionDate} at {forecastState.scenario.cutoffTime} UTC…</Text>
            </Stack>
          )}

          {forecastState.status === 'error' && (
            <Alert.Root status="error" alignItems="flex-start">
              <Alert.Indicator />
              <Box flex="1">
                <Alert.Title>Forecast unavailable</Alert.Title>
                <Alert.Description>{forecastState.message}</Alert.Description>
                <Button mt="4" size="sm" onClick={() => void loadScenario(forecastState.scenario, compareEnabledRef.current)}>Try again</Button>
              </Box>
            </Alert.Root>
          )}

          {forecastState.status === 'success' && (
            <Stack gap={{ base: 6, md: 8 }}>
              <Flex as="section" aria-label="Applied scenario" direction={{ base: 'column', md: 'row' }} gap={{ base: 4, md: 10 }} bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="lg" p={{ base: 5, md: 6 }}>
                <Box><Text color="fg.muted" fontSize="sm">Applied decision cutoff</Text><Text fontWeight="semibold">{formatTimestamp(forecastState.data.decision_time)}</Text></Box>
                <Box><Text color="fg.muted" fontSize="sm">Derived delivery day</Text><Text fontWeight="semibold">{formatDate(forecastState.data.delivery_date)}</Text></Box>
                <Box><Text color="fg.muted" fontSize="sm">Forecast retrieval window</Text><Text fontWeight="semibold">Previous {forecastState.data.retrieval_lookback_hours} hours</Text></Box>
              </Flex>

              {compareEnabled && (
                <Alert.Root status="info">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Retrospective comparison</Alert.Title>
                    <Alert.Description>Actual generation was unavailable at the purchasing decision time.</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {compareEnabled && comparisonState.status === 'loading' && (
                <Stack role="status" aria-live="polite" direction="row" gap="3" align="center">
                  <Spinner size="sm" /><Text>Loading actual generation… Forecast results remain available below.</Text>
                </Stack>
              )}

              {compareEnabled && comparisonState.status === 'error' && (
                <Alert.Root status="error" alignItems="flex-start">
                  <Alert.Indicator />
                  <Box flex="1">
                    <Alert.Title>Actual generation unavailable</Alert.Title>
                    <Alert.Description>{comparisonState.message} Forecast results remain available.</Alert.Description>
                    <Button mt="4" size="sm" onClick={() => void loadComparison(comparisonState.scenario, scenarioVersion.current)}>Retry actuals</Button>
                  </Box>
                </Alert.Root>
              )}

              {comparisonData ? <ComparisonCoverage data={comparisonData} /> : <ForecastCoverage coverage={forecastState.data.coverage} />}

              {comparisonData && (comparisonData.coverage.actual.missing_hours > 0 || comparisonData.coverage.actual.conflicting_hours > 0) && (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Partial actual coverage</Alert.Title>
                    <Alert.Description>Hours require both half-hour readings. Missing and conflicting source values remain unavailable and are never filled or treated as zero.</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {comparisonData && <AccuracySummary accuracy={comparisonData.accuracy} />}

              <Stack as="section" aria-labelledby="forecast-chart-title" gap="3">
                <Box>
                  <Heading as="h2" id="forecast-chart-title" size="xl">{comparisonData ? 'Forecast and actual profile' : 'Forecast profile'}</Heading>
                  <Text color="fg.muted" mt="1">Target hour in UTC against generation in MW. Gaps represent unavailable values.</Text>
                  {comparisonData && <Text color="fg.muted" fontSize="sm" mt="1">Actual data retrieved {formatTimestamp(comparisonData.actual_retrieved_at)}. Hourly actual is the mean of the H and H+30 half-hour averages.</Text>}
                </Box>
                <ForecastChart hours={forecastState.data.hours} comparisonHours={comparisonData?.hours} />
              </Stack>

              <Stack as="section" aria-labelledby="forecast-table-title" gap="3">
                <Box>
                  <Heading as="h2" id="forecast-table-title" size="xl">{comparisonData ? 'Hourly comparison details' : 'Hourly forecast details'}</Heading>
                  <Text color="fg.muted" mt="1">All timestamps are UTC. Error is forecast minus actual. Missing generation is never represented as zero.</Text>
                </Box>
                {comparisonData ? <ComparisonTable hours={comparisonData.hours} /> : <ForecastTable hours={forecastState.data.hours} />}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

export default App
