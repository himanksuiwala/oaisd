import { Badge, Box, Button, Card, DataList, Flex, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { type ReactNode, useRef } from 'react'
import type { ComparisonHour, DataStatus, ForecastHour } from '../../domain/windAnalysis.ts'
import { formatError, formatHour, formatMw, formatTimestamp } from '../../lib/windFormatters.ts'

export function StatusBadge({ status }: { status: DataStatus }) {
  return (
    <Badge colorPalette={status === 'conflict' ? 'caution' : 'gray'} variant="surface">
      {status === 'conflict' ? 'Data conflict' : 'Unavailable'}
    </Badge>
  )
}

interface HourlyTableShellProps {
  children: ReactNode
  compact?: boolean
  scrollable?: boolean
  minW?: string
}

export function HourlyTableShell({
  children,
  compact = false,
  scrollable = false,
  minW,
}: HourlyTableShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const defaultMinW = compact ? '560px' : '680px'

  return (
    <Box
      display={compact || scrollable ? 'block' : { base: 'none', md: 'block' }}
      height={scrollable ? 'full' : undefined}
      minH={scrollable ? '0' : undefined}
      minW="0"
      maxW="100%"
      w="full"
    >
      <Box
        ref={scrollRef}
        borderWidth="1px"
        borderColor="border.subtle"
        rounded="lg"
        height={scrollable ? 'full' : undefined}
        minH={scrollable ? '0' : undefined}
        minW="0"
        maxW="100%"
        w="full"
        overflowY={scrollable ? 'auto' : 'visible'}
        overflowX="auto"
        overscrollBehavior={scrollable ? 'contain' : undefined}
        scrollbarGutter={scrollable ? 'stable' : undefined}
        position="relative"
      >
        <Table.Root minW={minW ?? defaultMinW} size={compact ? 'sm' : 'md'} w="full">
          {children}
        </Table.Root>
        {scrollable && <Box h="6" w="full" aria-hidden="true" pointerEvents="none" />}
      </Box>
    </Box>
  )
}

export interface ForecastTableProps {
  hours: ForecastHour[]
  selectedTargetTime: string
  onSelectHour: (targetTime: string) => void
  scrollable?: boolean
  compact?: boolean
}

export function ForecastTable({
  hours,
  selectedTargetTime,
  onSelectHour,
  scrollable = false,
  compact = false,
}: ForecastTableProps) {
  return (
    <>
      <Stack display={compact || scrollable ? 'none' : { base: 'flex', md: 'none' }} gap="3">
        {hours.map((hour) => {
          const isSelected = selectedTargetTime === hour.target_time
          return (
            <Card.Root
              key={hour.target_time}
              variant="outline"
              bg={isSelected ? 'brand.subtle' : 'surface.panel'}
              borderColor={isSelected ? 'brand.emphasized' : 'border.subtle'}
              borderInlineStartWidth={isSelected ? '4px' : '1px'}
              borderInlineStartColor={isSelected ? 'brand.emphasized' : 'border.subtle'}
            >
              <Card.Body p="4">
                <DataList.Root orientation="horizontal" size="sm">
                  <DataList.Item>
                    <DataList.ItemLabel>Delivery hour</DataList.ItemLabel>
                    <DataList.ItemValue fontWeight="semibold">{formatHour(hour.target_time)}</DataList.ItemValue>
                  </DataList.Item>
                  <DataList.Item>
                    <DataList.ItemLabel>Forecast</DataList.ItemLabel>
                    <DataList.ItemValue fontWeight="bold" fontVariantNumeric="tabular-nums">
                      {hour.status === 'available' ? `${formatMw(hour.generation_mw)} MW` : <StatusBadge status={hour.status} />}
                    </DataList.ItemValue>
                  </DataList.Item>
                  <DataList.Item>
                    <DataList.ItemLabel>Published</DataList.ItemLabel>
                    <DataList.ItemValue textAlign="end">
                      {hour.publish_time ? formatTimestamp(hour.publish_time) : 'Not available'}
                    </DataList.ItemValue>
                  </DataList.Item>
                </DataList.Root>
                <Button
                  mt="3"
                  size="sm"
                  minH="11"
                  variant={isSelected ? 'solid' : 'outline'}
                  colorPalette="brand"
                  width="full"
                  onClick={() => onSelectHour(hour.target_time)}
                >
                  {isSelected ? 'Selected hour' : 'View hour'}
                </Button>
              </Card.Body>
            </Card.Root>
          )
        })}
      </Stack>

      <HourlyTableShell compact={compact} scrollable={scrollable}>
        <Table.Header bg="surface.raised">
          <Table.Row>
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle">
              {compact ? 'Delivery hour' : 'Target timestamp'}
            </Table.ColumnHeader>
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle" textAlign="end">
              Forecast generation (MW)
            </Table.ColumnHeader>
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle">
              Selected publication timestamp
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {hours.map((hour) => {
            const isSelected = selectedTargetTime === hour.target_time
            return (
              <Table.Row
                key={hour.target_time}
                aria-selected={isSelected}
                tabIndex={0}
                cursor="pointer"
                bg={isSelected ? 'brand.subtle' : undefined}
                transition="background 140ms ease-out"
                _hover={{ bg: isSelected ? 'brand.muted' : 'surface.raised' }}
                _focusVisible={{ outline: '2px solid', outlineColor: 'focus.ring', outlineOffset: '-2px', zIndex: 1 }}
                onClick={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest('button')) return
                  onSelectHour(hour.target_time)
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectHour(hour.target_time)
                  }
                }}
              >
                <Table.Cell
                  whiteSpace="nowrap"
                  borderInlineStartWidth="3px"
                  borderInlineStartColor={isSelected ? 'brand.emphasized' : 'transparent'}
                  fontWeight={isSelected ? 'semibold' : 'normal'}
                >
                  {compact ? formatHour(hour.target_time) : formatTimestamp(hour.target_time)}
                </Table.Cell>
                <Table.Cell textAlign="end" fontWeight="semibold" fontVariantNumeric="tabular-nums">
                  {hour.status === 'available' ? formatMw(hour.generation_mw) : <StatusBadge status={hour.status} />}
                </Table.Cell>
                <Table.Cell whiteSpace="nowrap">
                  {hour.publish_time ? formatTimestamp(hour.publish_time) : 'Not available'}
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </HourlyTableShell>
    </>
  )
}

export interface ComparisonTableProps {
  hours: ComparisonHour[]
  selectedTargetTime: string
  onSelectHour: (targetTime: string) => void
  onInspectSources: (hour: ComparisonHour, trigger: HTMLButtonElement) => void
  compact?: boolean
  scrollable?: boolean
}

export function ComparisonTable({
  hours,
  selectedTargetTime,
  onSelectHour,
  onInspectSources,
  compact = false,
  scrollable = false,
}: ComparisonTableProps) {
  return (
    <>
      <Stack display={compact || scrollable ? 'none' : { base: 'flex', md: 'none' }} gap="3">
        {hours.map((hour) => {
          const isSelected = selectedTargetTime === hour.target_time
          return (
            <Card.Root
              key={hour.target_time}
              variant="outline"
              bg={isSelected ? 'brand.subtle' : 'surface.panel'}
              borderColor={isSelected ? 'brand.emphasized' : 'border.subtle'}
              borderInlineStartWidth={isSelected ? '4px' : '1px'}
              borderInlineStartColor={isSelected ? 'brand.emphasized' : 'border.subtle'}
            >
              <Card.Body p="4">
                <Flex justify="space-between" align="baseline" gap="4" mb="3">
                  <Text color="text.secondary" fontSize="sm">Delivery hour</Text>
                  <Text fontWeight="semibold">{formatHour(hour.target_time)}</Text>
                </Flex>
                <SimpleGrid columns={3} gap="3">
                  <Box>
                    <Text color="text.secondary" fontSize="xs">Forecast</Text>
                    <Text fontWeight="bold" fontVariantNumeric="tabular-nums">
                      {hour.forecast_status === 'available' ? formatMw(hour.forecast_mw) : <StatusBadge status={hour.forecast_status} />}
                    </Text>
                  </Box>
                  <Box>
                    <Text color="text.secondary" fontSize="xs">Actual</Text>
                    <Text fontWeight="bold" fontVariantNumeric="tabular-nums">
                      {hour.actual_status === 'available' ? formatMw(hour.actual_mw) : <StatusBadge status={hour.actual_status} />}
                    </Text>
                  </Box>
                  <Box textAlign="end">
                    <Text color="text.secondary" fontSize="xs">Error</Text>
                    <Text fontWeight="bold" fontVariantNumeric="tabular-nums">
                      {hour.error_mw === null ? '—' : formatError(hour.error_mw)}
                    </Text>
                  </Box>
                </SimpleGrid>
                <Flex gap="2" mt="3">
                  <Button
                    size="sm"
                    minH="11"
                    variant={isSelected ? 'solid' : 'outline'}
                    colorPalette="brand"
                    flex="1"
                    onClick={() => onSelectHour(hour.target_time)}
                  >
                    {isSelected ? 'Selected hour' : 'View hour'}
                  </Button>
                  <Button
                    size="sm"
                    minH="11"
                    variant="outline"
                    colorPalette="brand"
                    flex="1"
                    onClick={(event) => {
                      onSelectHour(hour.target_time)
                      onInspectSources(hour, event.currentTarget)
                    }}
                  >
                    Inspect sources
                  </Button>
                </Flex>
              </Card.Body>
            </Card.Root>
          )
        })}
      </Stack>

      <HourlyTableShell compact={compact} scrollable={scrollable}>
        <Table.Header bg="surface.raised">
          <Table.Row>
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle">
              {compact ? 'Delivery hour' : 'Target timestamp'}
            </Table.ColumnHeader>
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle" textAlign="end">
              Forecast (MW)
            </Table.ColumnHeader>
            {!compact && (
              <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle">
                Forecast publication
              </Table.ColumnHeader>
            )}
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle" textAlign="end">
              Hourly actual (MW)
            </Table.ColumnHeader>
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle" textAlign="end">
              Error (MW)
            </Table.ColumnHeader>
            <Table.ColumnHeader position="sticky" top="0" zIndex="2" bg="surface.raised" borderBottomWidth="1px" borderColor="border.subtle">
              Actions
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {hours.map((hour) => {
            const isSelected = selectedTargetTime === hour.target_time
            return (
              <Table.Row
                key={hour.target_time}
                aria-selected={isSelected}
                tabIndex={0}
                cursor="pointer"
                bg={isSelected ? 'brand.subtle' : undefined}
                transition="background 140ms ease-out"
                _hover={{ bg: isSelected ? 'brand.muted' : 'surface.raised' }}
                _focusVisible={{ outline: '2px solid', outlineColor: 'focus.ring', outlineOffset: '-2px', zIndex: 1 }}
                onClick={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest('button')) return
                  onSelectHour(hour.target_time)
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectHour(hour.target_time)
                  }
                }}
              >
                <Table.Cell
                  whiteSpace="nowrap"
                  borderInlineStartWidth="3px"
                  borderInlineStartColor={isSelected ? 'brand.emphasized' : 'transparent'}
                  fontWeight={isSelected ? 'semibold' : 'normal'}
                >
                  {compact ? formatHour(hour.target_time) : formatTimestamp(hour.target_time)}
                </Table.Cell>
                <Table.Cell textAlign="end" fontWeight="semibold" fontVariantNumeric="tabular-nums">
                  {hour.forecast_status === 'available' ? formatMw(hour.forecast_mw) : <StatusBadge status={hour.forecast_status} />}
                </Table.Cell>
                {!compact && (
                  <Table.Cell whiteSpace="nowrap">
                    {hour.forecast_publish_time ? formatTimestamp(hour.forecast_publish_time) : 'Not available'}
                  </Table.Cell>
                )}
                <Table.Cell textAlign="end" fontWeight="semibold" fontVariantNumeric="tabular-nums">
                  {hour.actual_status === 'available' ? formatMw(hour.actual_mw) : <StatusBadge status={hour.actual_status} />}
                </Table.Cell>
                <Table.Cell textAlign="end" fontWeight="semibold" fontVariantNumeric="tabular-nums">
                  {hour.error_mw === null ? (
                    <Text color="text.secondary" as="span">Not available</Text>
                  ) : (
                    formatError(hour.error_mw)
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="1" align="center">
                    <Button
                      size="xs"
                      variant="plain"
                      colorPalette="brand"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectHour(hour.target_time)
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="brand"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectHour(hour.target_time)
                        onInspectSources(hour, event.currentTarget)
                      }}
                    >
                      Inspect sources
                    </Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </HourlyTableShell>
    </>
  )
}
