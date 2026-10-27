import { Box, Fieldset, Flex, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export function AnalysisToolbar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Fieldset.Root bg="surface.panel" borderWidth="1px" borderColor="border.subtle" rounded="panel" px={{ base: 3, md: 4 }} py="3">
      <Fieldset.Legend position="absolute" width="1px" height="1px" overflow="hidden" clip="rect(0, 0, 0, 0)">{label}</Fieldset.Legend>
      <Fieldset.Content>{children}</Fieldset.Content>
    </Fieldset.Root>
  )
}

export function AppliedScenarioBar({
  items,
  extra,
}: {
  items: Array<{ label: string; value: string }>
  extra?: ReactNode
}) {
  return (
    <Flex as="section" aria-label="Applied scenario" direction={{ base: 'column', sm: 'row' }} gap={{ base: 2, sm: 6, lg: 8 }} align={{ sm: 'center' }} justify="space-between" bg="brand.subtle" borderWidth="1px" borderColor="brand.emphasized" rounded="panel" px={{ base: 3, md: 4 }} py="2.5" wrap="wrap">
      <Flex gap={{ base: 2, sm: 6, lg: 8 }} wrap="wrap" align="baseline">
        {items.map((item) => (
          <Flex key={item.label} gap="2" align="baseline" minW="0">
            <Text color="text.secondary" fontSize="xs" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase" whiteSpace="nowrap">{item.label}</Text>
            <Text fontSize="sm" fontWeight="semibold" fontVariantNumeric="tabular-nums">{item.value}</Text>
          </Flex>
        ))}
      </Flex>
      {extra && <Box>{extra}</Box>}
    </Flex>
  )
}
