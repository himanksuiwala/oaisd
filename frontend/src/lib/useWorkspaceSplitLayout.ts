import { useEffect, useState } from 'react'

const WORKSPACE_SPLIT_QUERY = '(min-width: 1180px) and (min-height: 720px)'

export function useWorkspaceSplitLayout() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(WORKSPACE_SPLIT_QUERY)
    const update = () => setEnabled(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return enabled
}
