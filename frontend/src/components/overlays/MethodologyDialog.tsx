import { Box, Button, Dialog, Heading, Portal, Stack, Text } from '@chakra-ui/react'

export type MethodologySection = 'overview' | 'daily' | 'period'

export function MethodologyButton({ onOpen, section = 'overview', label = 'Methodology' }: { onOpen: (section: MethodologySection) => void; section?: MethodologySection; label?: string }) {
  return (
    <Button variant="plain" colorPalette="brand" size="sm" px="2" minH="11" onClick={() => onOpen(section)}>{label}</Button>
  )
}

export function MethodologyDialog({ open, section, onOpenChange }: { open: boolean; section: MethodologySection; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(details) => onOpenChange(details.open)} placement="center" size="lg" lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="min(720px, calc(100dvh - 32px))">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title>Methodology and data conventions</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body overflowY="auto" py="5">
              <Stack gap="5">
                <Box>
                  <Heading as="h3" size="md">Decision-time forecast</Heading>
                  <Text color="text.secondary" mt="1">For each delivery hour, GridBricks selects the latest eligible WINDFOR publication at or before the applied UTC cutoff, within the preceding 24-hour retrieval window.</Text>
                </Box>
                <Box bg={section === 'daily' ? 'brand.subtle' : undefined} rounded="md" p={section === 'daily' ? '3' : '0'}>
                  <Heading as="h3" size="md">Daily accuracy</Heading>
                  <Text color="text.secondary" mt="1">MAE, bias, and RMSE use matched hourly forecast–actual pairs. Positive bias means overestimation. Missing and conflicting hours are excluded rather than treated as zero.</Text>
                </Box>
                <Box bg={section === 'period' ? 'brand.subtle' : undefined} rounded="md" p={section === 'period' ? '3' : '0'}>
                  <Heading as="h3" size="md">Period accuracy</Heading>
                  <Text color="text.secondary" mt="1">Period metrics pool every valid hourly error across successful days. They do not average daily metrics. Failed days contribute 24 unmatched hours to expected coverage.</Text>
                </Box>
                <Box>
                  <Heading as="h3" size="md">Timezone convention</Heading>
                  <Text color="text.secondary" mt="1">All delivery dates, target delivery hours, forecast cutoff times, and publication timestamps across GridBricks are strictly recorded and evaluated in UTC.</Text>
                </Box>
                <Box>
                  <Heading as="h3" size="md">Actual-generation alignment</Heading>
                  <Text color="text.secondary" mt="1">Hourly actual MW is the arithmetic mean of the two FUELHH half-hour averages at H and H+30. Both readings are required. WINDFOR interval-average semantics are unverified, so this remains an explicit project comparison convention.</Text>
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle">
              <Dialog.ActionTrigger asChild><Button colorPalette="brand">Close</Button></Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
