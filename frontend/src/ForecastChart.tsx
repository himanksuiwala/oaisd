import { Box, Stack, Text } from '@chakra-ui/react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'

export type ForecastChartHour = {
  target_time: string
  generation_mw: number | null
  publish_time: string | null
  status: 'available' | 'missing' | 'conflict'
}

export type ComparisonChartHour = {
  target_time: string
  forecast_mw: number | null
  forecast_publish_time: string | null
  forecast_status: 'available' | 'missing' | 'conflict'
  actual_readings: Array<{
    target_time: string
    generation_mw: number | null
    status: 'available' | 'missing' | 'conflict'
  }>
  actual_mw: number | null
  actual_status: 'available' | 'missing' | 'conflict'
}

type ChartPoint = {
  targetTime: string
  targetHour: string
  forecastMw: number | null
  forecastPublishTime: string | null
  forecastStatus: 'available' | 'missing' | 'conflict'
  actualMw: number | null
  actualStatus: 'available' | 'missing' | 'conflict' | null
  actualReadings: ComparisonChartHour['actual_readings']
}

const detailFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function formatDetail(value: string) {
  return `${detailFormatter.format(new Date(value))} UTC`
}

function formatMw(value: number | null) {
  return value === null ? 'Unavailable' : `${value.toLocaleString('en-GB')} MW`
}

function ForecastTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as ChartPoint

  return (
    <Stack gap="2" bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="md" p="3" shadow="md" maxW="xs">
      <Text fontWeight="semibold">{formatDetail(point.targetTime)}</Text>
      <Box>
        <Text>Forecast: {formatMw(point.forecastMw)}</Text>
        <Text color="fg.muted" fontSize="sm">
          Published {point.forecastPublishTime ? formatDetail(point.forecastPublishTime) : 'Not available'}
        </Text>
      </Box>
      {point.actualStatus && (
        <Box>
          <Text>Hourly actual: {formatMw(point.actualMw)}</Text>
          {point.actualReadings.map((reading) => (
            <Text key={reading.target_time} color="fg.muted" fontSize="sm">
              {formatDetail(reading.target_time)}: {formatMw(reading.generation_mw)} ({reading.status})
            </Text>
          ))}
        </Box>
      )}
    </Stack>
  )
}

export function ForecastChart({
  hours,
  comparisonHours,
}: {
  hours: ForecastChartHour[]
  comparisonHours?: ComparisonChartHour[]
}) {
  const data: ChartPoint[] = comparisonHours
    ? comparisonHours.map((hour) => ({
        targetTime: hour.target_time,
        targetHour: new Date(hour.target_time).toISOString().slice(11, 16),
        forecastMw: hour.forecast_status === 'available' ? hour.forecast_mw : null,
        forecastPublishTime: hour.forecast_publish_time,
        forecastStatus: hour.forecast_status,
        actualMw: hour.actual_status === 'available' ? hour.actual_mw : null,
        actualStatus: hour.actual_status,
        actualReadings: hour.actual_readings,
      }))
    : hours.map((hour) => ({
        targetTime: hour.target_time,
        targetHour: new Date(hour.target_time).toISOString().slice(11, 16),
        forecastMw: hour.status === 'available' ? hour.generation_mw : null,
        forecastPublishTime: hour.publish_time,
        forecastStatus: hour.status,
        actualMw: null,
        actualStatus: null,
        actualReadings: [],
      }))

  return (
    <Box
      role="img"
      aria-label={comparisonHours
        ? 'Line chart comparing hourly forecast and actual wind generation in megawatts. Missing and conflicting hours appear as gaps.'
        : 'Line chart of hourly forecast generation in megawatts. Missing and conflicting hours appear as gaps.'}
      h={{ base: '280px', md: '360px' }}
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="lg"
      px={{ base: 1, md: 4 }}
      py="4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} accessibilityLayer>
          <CartesianGrid stroke="var(--chakra-colors-border-muted)" vertical={false} />
          <XAxis dataKey="targetHour" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={(value: number) => value.toLocaleString('en-GB')}
            label={{ value: 'MW', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={ForecastTooltip} cursor={{ strokeDasharray: '4 4' }} />
          {comparisonHours && <Legend verticalAlign="top" height={32} />}
          <Line
            type="linear"
            dataKey="forecastMw"
            name="Forecast"
            stroke="var(--chakra-colors-blue-solid)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          {comparisonHours && (
            <Line
              type="linear"
              dataKey="actualMw"
              name="Actual"
              stroke="var(--chakra-colors-teal-solid)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
