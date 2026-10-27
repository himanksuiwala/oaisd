import { IconButton, Popover, Portal } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export function InfoGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" />
      <path d="M8 7v4.5" />
      <circle cx="8" cy="4.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
    </svg>
  )
}

export type InfoPopoverProps = {
  title?: string
  ariaLabel: string
  children: ReactNode
  footer?: ReactNode
}

export function InfoPopover({ title, ariaLabel, children, footer }: InfoPopoverProps) {
  return (
    <Popover.Root
      positioning={{ placement: 'bottom-start', gutter: 8 }}
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>
        <IconButton
          variant="ghost"
          size="xs"
          minW="10"
          minH="10"
          aria-label={ariaLabel}
          title={ariaLabel}
          color="text.secondary"
          _hover={{ color: 'fg', bg: 'surface.raised' }}
          rounded="md"
        >
          <InfoGlyph />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            maxW="320px"
            bg="surface.panel"
            borderWidth="1px"
            borderColor="border.subtle"
            rounded="panel"
            shadow="lg"
            p="3.5"
            zIndex="popover"
          >
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            {title && (
              <Popover.Title fontSize="sm" fontWeight="semibold" mb="1.5">
                {title}
              </Popover.Title>
            )}
            <Popover.Body fontSize="xs" color="text.secondary" p="0">
              {children}
            </Popover.Body>
            {footer && (
              <Popover.Footer
                borderTopWidth="1px"
                borderColor="border.subtle"
                pt="2"
                mt="2.5"
                p="0"
              >
                {footer}
              </Popover.Footer>
            )}
            <Popover.CloseTrigger asChild position="absolute" top="2" right="2">
              <IconButton
                variant="ghost"
                size="2xs"
                aria-label="Close"
                minW="6"
                minH="6"
                color="text.secondary"
                _hover={{ color: 'fg', bg: 'surface.raised' }}
              >
                <CloseGlyph />
              </IconButton>
            </Popover.CloseTrigger>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
