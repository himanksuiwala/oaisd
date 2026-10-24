import { Box, Stack, Text } from '@chakra-ui/react'
import {
  CartesianGrid,
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

type ChartPoint = ForecastChartHour & {
  targetHour: string
  generationMw: number | null
}

const detailFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function formatDetail(value: string) {
  return `${detailFormatter.format(new Date(value))} UTC`
}

function ForecastTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as ChartPoint

  return (
    <Stack gap="1" bg="bg.panel" borderWidth="1px" borderColor="border.subtle" rounded="md" p="3" shadow="md">
      <Text fontWeight="semibold">{formatDetail(point.target_time)}</Text>
      <Text>{point.generation_mw?.toLocaleString('en-GB')} MW</Text>
      <Text color="fg.muted" fontSize="sm">
        Published {point.publish_time ? formatDetail(point.publish_time) : 'Not available'}
      </Text>
    </Stack>
  )
}

export function ForecastChart({ hours }: { hours: ForecastChartHour[] }) {
  const data: ChartPoint[] = hours.map((hour) => ({
    ...hour,
    targetHour: new Date(hour.target_time).toISOString().slice(11, 16),
    generationMw: hour.status === 'available' ? hour.generation_mw : null,
  }))

  return (
    <Box
      role="img"
      aria-label="Line chart of hourly forecast generation in megawatts. Missing and conflicting hours appear as gaps."
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
          <Line
            type="linear"
            dataKey="generationMw"
            name="Forecast generation"
            stroke="var(--chakra-colors-blue-solid)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
