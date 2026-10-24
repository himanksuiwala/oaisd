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
  Table,
  Text,
} from '@chakra-ui/react'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { ForecastChart } from './ForecastChart.tsx'

type ForecastStatus = 'available' | 'missing' | 'conflict'

type ForecastHour = {
  target_time: string
  generation_mw: number | null
  publish_time: string | null
  status: ForecastStatus
}

type ForecastResponse = {
  decision_time: string
  delivery_date: string
  unit: 'MW'
  source: 'Elexon WINDFOR'
  source_record_count: number
  retrieval_lookback_hours: 24
  coverage: {
    expected_hours: 24
    available_hours: number
    missing_hours: number
    conflicting_hours: number
  }
  hours: ForecastHour[]
}

type Scenario = {
  decisionDate: string
  cutoffTime: string
}

type LoadState =
  | { status: 'loading'; scenario: Scenario }
  | { status: 'error'; scenario: Scenario; message: string }
  | { status: 'success'; data: ForecastResponse }

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

async function fetchForecast(scenario: Scenario, signal: AbortSignal): Promise<ForecastResponse> {
  const query = new URLSearchParams({
    decision_date: scenario.decisionDate,
    cutoff_time: scenario.cutoffTime,
  })
  const response = await fetch(`/api/wind-forecast?${query}`, { signal })
  if (!response.ok) {
    throw new Error(`The forecast service returned HTTP ${response.status}.`)
  }
  return (await response.json()) as ForecastResponse
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
                {hour.status === 'available' && hour.generation_mw !== null ? (
                  hour.generation_mw.toLocaleString('en-GB')
                ) : (
                  <Badge colorPalette={hour.status === 'conflict' ? 'orange' : 'gray'}>
                    {hour.status === 'conflict' ? 'Data conflict' : 'Unavailable'}
                  </Badge>
                )}
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

function Coverage({ data }: { data: ForecastResponse }) {
  const items = [
    { label: 'Available', value: data.coverage.available_hours, color: 'green' },
    { label: 'Missing', value: data.coverage.missing_hours, color: 'gray' },
    { label: 'Conflicting', value: data.coverage.conflicting_hours, color: 'orange' },
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

export function App() {
  const [draft, setDraft] = useState<Scenario>(DEFAULT_SCENARIO)
  const [state, setState] = useState<LoadState>({ status: 'loading', scenario: DEFAULT_SCENARIO })
  const activeRequest = useRef<{ id: number; controller: AbortController } | null>(null)
  const nextRequestId = useRef(0)

  const loadForecast = useCallback(async (scenario: Scenario) => {
    activeRequest.current?.controller.abort()
    const controller = new AbortController()
    const id = ++nextRequestId.current
    activeRequest.current = { id, controller }
    setState({ status: 'loading', scenario })

    try {
      const data = await fetchForecast(scenario, controller.signal)
      if (activeRequest.current?.id === id) {
        setState({ status: 'success', data })
      }
    } catch (error) {
      if (controller.signal.aborted || activeRequest.current?.id !== id) return
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      setState({ status: 'error', scenario, message })
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const id = ++nextRequestId.current
    activeRequest.current = { id, controller }

    void fetchForecast(DEFAULT_SCENARIO, controller.signal)
      .then((data) => {
        if (activeRequest.current?.id === id) setState({ status: 'success', data })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || activeRequest.current?.id !== id) return
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
        setState({ status: 'error', scenario: DEFAULT_SCENARIO, message })
      })

    return () => controller.abort()
  }, [])

  function applyScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadForecast({ ...draft })
  }

  return (
    <Box minH="100vh" bg="bg.subtle" py={{ base: 8, md: 14 }}>
      <Container maxW="6xl">
        <Stack gap={{ base: 6, md: 8 }}>
          <Stack gap="3">
            <Text color="fg.muted" fontWeight="medium" letterSpacing="wide" textTransform="uppercase">
              Day-ahead forecast review
            </Text>
            <Heading as="h1" size={{ base: '3xl', md: '4xl' }} letterSpacing="tight">
              Explore January 2026 wind forecasts
            </Heading>
            <Text color="fg.muted" maxW="3xl" fontSize={{ base: 'md', md: 'lg' }}>
              Choose a UTC decision cutoff to see the latest eligible Elexon WINDFOR publication
              for each hour of the following delivery day. This analysis does not recommend or execute purchases.
            </Text>
          </Stack>

          <form onSubmit={applyScenario}>
            <Box bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="lg" p={{ base: 5, md: 6 }}>
              <Stack direction={{ base: 'column', md: 'row' }} gap="4" align={{ md: 'end' }}>
              <Field.Root required flex="1">
                <Field.Label>Decision date</Field.Label>
                <Input
                  type="date"
                  min="2026-01-01"
                  max="2026-01-31"
                  value={draft.decisionDate}
                  onChange={(event) => setDraft((current) => ({ ...current, decisionDate: event.target.value }))}
                />
              </Field.Root>
              <Field.Root required flex="1">
                <Field.Label>Cutoff time (UTC)</Field.Label>
                <Input
                  type="time"
                  value={draft.cutoffTime}
                  onChange={(event) => setDraft((current) => ({ ...current, cutoffTime: event.target.value }))}
                />
              </Field.Root>
                <Button type="submit" colorPalette="blue" minW={{ md: '28' }}>Apply</Button>
              </Stack>
            </Box>
          </form>

          {state.status === 'loading' && (
            <Stack role="status" aria-live="polite" direction="row" gap="3" py="12" justify="center" align="center">
              <Spinner size="sm" />
              <Text>Loading {state.scenario.decisionDate} at {state.scenario.cutoffTime} UTC…</Text>
            </Stack>
          )}

          {state.status === 'error' && (
            <Alert.Root status="error" alignItems="flex-start">
              <Alert.Indicator />
              <Box flex="1">
                <Alert.Title>Forecast unavailable</Alert.Title>
                <Alert.Description>
                  {state.message} The requested scenario was {state.scenario.decisionDate} at {state.scenario.cutoffTime} UTC.
                </Alert.Description>
                <Button mt="4" size="sm" onClick={() => void loadForecast(state.scenario)}>Try again</Button>
              </Box>
            </Alert.Root>
          )}

          {state.status === 'success' && (
            <Stack gap={{ base: 6, md: 8 }}>
              <Flex as="section" aria-label="Applied scenario" direction={{ base: 'column', md: 'row' }} gap={{ base: 4, md: 10 }} bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="lg" p={{ base: 5, md: 6 }}>
                <Box>
                  <Text color="fg.muted" fontSize="sm">Applied decision cutoff</Text>
                  <Text fontWeight="semibold">{formatTimestamp(state.data.decision_time)}</Text>
                </Box>
                <Box>
                  <Text color="fg.muted" fontSize="sm">Derived delivery day</Text>
                  <Text fontWeight="semibold">{formatDate(state.data.delivery_date)}</Text>
                </Box>
                <Box>
                  <Text color="fg.muted" fontSize="sm">Retrieval window</Text>
                  <Text fontWeight="semibold">Previous {state.data.retrieval_lookback_hours} hours</Text>
                </Box>
              </Flex>

              <Coverage data={state.data} />

              {(state.data.coverage.missing_hours > 0 || state.data.coverage.conflicting_hours > 0) && (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Partial forecast coverage</Alert.Title>
                    <Alert.Description>
                      Gaps mean no eligible record was found within the 24-hour retrieval window, or duplicate source values conflicted. They are not zero generation.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {state.data.coverage.available_hours === 0 && (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No forecast values found</Alert.Title>
                    <Alert.Description>
                      Elexon returned no usable generation values for this delivery day and cutoff within the retrieval window.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              <Stack as="section" aria-labelledby="forecast-chart-title" gap="3">
                <Box>
                  <Heading as="h2" id="forecast-chart-title" size="xl">Forecast profile</Heading>
                  <Text color="fg.muted" mt="1">Target hour in UTC against forecast generation in MW. Hover or focus points for publication details.</Text>
                </Box>
                <ForecastChart hours={state.data.hours} />
              </Stack>

              <Stack as="section" aria-labelledby="forecast-table-title" gap="3">
                <Box>
                  <Heading as="h2" id="forecast-table-title" size="xl">Hourly forecast details</Heading>
                  <Text color="fg.muted" mt="1">All timestamps are UTC. Missing generation is never represented as zero.</Text>
                </Box>
                <ForecastTable hours={state.data.hours} />
              </Stack>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

export default App
