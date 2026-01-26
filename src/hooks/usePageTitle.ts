import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = `${title} | Job Tracker`

    return () => {
      document.title = prevTitle
    }
  }, [title])
}
