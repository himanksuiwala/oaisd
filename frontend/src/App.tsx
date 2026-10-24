import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Spinner,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

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
  hours: ForecastHour[]
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ForecastResponse }

const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function formatTimestamp(value: string) {
  return `${timestampFormatter.format(new Date(value))} UTC`
}

async function fetchForecast(): Promise<ForecastResponse> {
  const response = await fetch('/api/wind-forecast')
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

export function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  const loadForecast = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const data = await fetchForecast()
      setState({ status: 'success', data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      setState({ status: 'error', message })
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchForecast()
      .then((data) => {
        if (active) setState({ status: 'success', data })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
        setState({ status: 'error', message })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <Box minH="100vh" bg="bg.subtle" py={{ base: 8, md: 14 }}>
      <Container maxW="6xl">
        <Stack gap={{ base: 6, md: 8 }}>
          <Stack gap="3">
            <Text color="fg.muted" fontWeight="medium" letterSpacing="wide" textTransform="uppercase">
              Day-ahead forecast review
            </Text>
            <Heading as="h1" size={{ base: '3xl', md: '4xl' }} letterSpacing="tight">
              Wind forecast available at the decision cutoff
            </Heading>
            <Text color="fg.muted" maxW="3xl" fontSize={{ base: 'md', md: 'lg' }}>
              A fixed January 2026 scenario showing the latest Elexon WINDFOR publication available
              for each delivery hour. This analysis does not recommend or execute purchases.
            </Text>
          </Stack>

          <Flex
            as="section"
            aria-label="Scenario details"
            direction={{ base: 'column', md: 'row' }}
            gap={{ base: 4, md: 10 }}
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border.subtle"
            rounded="lg"
            p={{ base: 5, md: 6 }}
          >
            <Box>
              <Text color="fg.muted" fontSize="sm">Decision cutoff</Text>
              <Text fontWeight="semibold">15 Jan 2026, 10:00 UTC</Text>
            </Box>
            <Box>
              <Text color="fg.muted" fontSize="sm">Delivery day</Text>
              <Text fontWeight="semibold">16 Jan 2026</Text>
            </Box>
            <Box>
              <Text color="fg.muted" fontSize="sm">Source</Text>
              <Text fontWeight="semibold">Elexon WINDFOR</Text>
            </Box>
          </Flex>

          {state.status === 'loading' && (
            <HStack role="status" aria-live="polite" gap="3" py="12" justify="center">
              <Spinner size="sm" />
              <Text>Loading the wind forecast…</Text>
            </HStack>
          )}

          {state.status === 'error' && (
            <Alert.Root status="error" alignItems="flex-start">
              <Alert.Indicator />
              <Box flex="1">
                <Alert.Title>Forecast unavailable</Alert.Title>
                <Alert.Description>
                  {state.message} Try again, or confirm that the backend can reach Elexon.
                </Alert.Description>
                <Button mt="4" size="sm" onClick={() => void loadForecast()}>
                  Try again
                </Button>
              </Box>
            </Alert.Root>
          )}

          {state.status === 'success' && (
            <Stack as="section" aria-labelledby="forecast-table-title" gap="4">
              <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap="2">
                <Box>
                  <Heading as="h2" id="forecast-table-title" size="xl">
                    Hourly forecast
                  </Heading>
                  <Text color="fg.muted" mt="1">
                    All timestamps are UTC. Missing generation is never represented as zero.
                  </Text>
                </Box>
                <Text color="fg.muted" fontSize="sm">
                  {state.data.hours.filter((hour) => hour.status === 'available').length} of 24 hours available
                </Text>
              </Flex>

              {state.data.hours.every((hour) => hour.status !== 'available') && (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No forecast values found</Alert.Title>
                    <Alert.Description>
                      Elexon returned no usable generation values for this delivery day and cutoff.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              <ForecastTable hours={state.data.hours} />
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

export default App
