import { Badge, Box, Button, CloseButton, Drawer, Flex, Portal, Text } from '@chakra-ui/react'
import type { ComparisonHour, ComparisonResponse, ForecastHour } from '../../domain/windAnalysis.ts'
import { formatDate } from '../../lib/windFormatters.ts'
import { ComparisonTable, ForecastTable } from './HourlyResults.tsx'

export function TableGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v18M3 9h18M3 15h18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </svg>
  )
}

export function HourlyBreakdownDrawer({
  open,
  onOpenChange,
  comparisonData,
  forecastHours,
  selectedTargetTime,
  onSelectHour,
  onInspectSources,
  deliveryDate,
  returnFocusTo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  comparisonData: ComparisonResponse | null
  forecastHours: ForecastHour[]
  selectedTargetTime: string
  onSelectHour: (targetTime: string) => void
  onInspectSources: (hour: ComparisonHour, trigger: HTMLButtonElement) => void
  deliveryDate: string
  returnFocusTo?: HTMLElement | null
}) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details) => {
        onOpenChange(details.open)
        if (!details.open && returnFocusTo) {
          requestAnimationFrame(() => returnFocusTo.focus({ preventScroll: true }))
        }
      }}
      placement="end"
      size={{ base: 'full', md: 'lg' }}
      lazyMount
      unmountOnExit
      restoreFocus
    >
      <Portal>
        <Drawer.Backdrop zIndex={1399} />
        <Drawer.Positioner zIndex={1400}>
          <Drawer.Content maxW={{ md: '720px' }} zIndex={1400} display="flex" flexDirection="column">
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py="4">
              <Flex justify="space-between" align="flex-start" width="full">
                <Box>
                  <Flex align="center" gap="2">
                    <Drawer.Title>
                      {comparisonData ? 'Hourly comparison details' : 'Hourly forecast details'}
                    </Drawer.Title>
                    <Badge colorPalette="brand" size="sm">24 hours</Badge>
                  </Flex>
                  <Text color="text.secondary" fontSize="xs" mt="0.5">
                    Delivery day: {formatDate(deliveryDate)} · All timestamps in UTC
                  </Text>
                </Box>
                <Drawer.CloseTrigger asChild>
                  <CloseButton size="sm" aria-label="Close hourly details drawer" />
                </Drawer.CloseTrigger>
              </Flex>
            </Drawer.Header>
            <Drawer.Body py="4" px="4" overflow="hidden" flex="1" minH="0">
              {comparisonData ? (
                <ComparisonTable
                  hours={comparisonData.hours}
                  selectedTargetTime={selectedTargetTime}
                  onSelectHour={onSelectHour}
                  onInspectSources={onInspectSources}
                  scrollable
                />
              ) : (
                <ForecastTable
                  hours={forecastHours}
                  selectedTargetTime={selectedTargetTime}
                  onSelectHour={onSelectHour}
                  scrollable
                />
              )}
            </Drawer.Body>
            <Drawer.Footer borderTopWidth="1px" borderColor="border.subtle" py="3">
              <Drawer.ActionTrigger asChild>
                <Button colorPalette="brand" minH="10" px="5">Close</Button>
              </Drawer.ActionTrigger>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
