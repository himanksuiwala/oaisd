import { Box, Container } from '@chakra-ui/react'
import { useState } from 'react'
import { SourceInspector } from './components/analysis/AnalysisResults.tsx'
import { AppHeader } from './components/app/AppHeader.tsx'
import { MethodologyDialog, type MethodologySection } from './components/overlays/MethodologyDialog.tsx'
import type { ComparisonHour } from './domain/windAnalysis.ts'
import { PeriodAnalysis } from './features/period/PeriodAnalysis.tsx'
import { SingleDayAnalysis } from './features/single-day/SingleDayAnalysis.tsx'
import { useSingleDayAnalysis } from './features/single-day/useSingleDayAnalysis.ts'

export function App() {
  const [view, setView] = useState<'single' | 'period'>('single')
  const [methodology, setMethodology] = useState<{ open: boolean; section: MethodologySection }>({ open: false, section: 'overview' })
  const [sourceInspector, setSourceInspector] = useState<{ hour: ComparisonHour; trigger: HTMLButtonElement } | null>(null)
  const singleDayAnalysis = useSingleDayAnalysis()

  function openMethodology(section: MethodologySection) {
    setMethodology({ open: true, section })
  }

  function inspectSources(hour: ComparisonHour, trigger: HTMLButtonElement) {
    singleDayAnalysis.setSelectedHourTarget(hour.target_time)
    setSourceInspector({ hour, trigger })
  }

  function setSourceInspectorOpen(open: boolean) {
    if (open) return
    const trigger = sourceInspector?.trigger
    setSourceInspector(null)
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }))
  }

  return (
    <Box minH="100dvh" bg="surface.page">
      <AppHeader view={view} onViewChange={setView} onOpenMethodology={openMethodology} />
      <Box as="main" py={{ base: 3, md: 4 }}>
        <Container maxW="8xl">
          <Box hidden={view !== 'single'}>
            <SingleDayAnalysis
              analysis={singleDayAnalysis}
              onOpenMethodology={openMethodology}
              onInspectSources={inspectSources}
            />
          </Box>
          <Box hidden={view !== 'period'}>
            <PeriodAnalysis onOpenMethodology={openMethodology} onInspectSources={inspectSources} />
          </Box>
        </Container>
      </Box>
      <MethodologyDialog open={methodology.open} section={methodology.section} onOpenChange={(open) => setMethodology((current) => ({ ...current, open }))} />
      <SourceInspector payload={sourceInspector} onOpenChange={setSourceInspectorOpen} />
    </Box>
  )
}

export default App
