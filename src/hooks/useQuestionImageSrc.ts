import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { QuestionItem } from '../types'

export function useQuestionImageSrc(question: QuestionItem): string {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (question.image_base64) {
        const value = question.image_base64.startsWith('data:')
          ? question.image_base64
          : `data:image/png;base64,${question.image_base64}`
        if (!cancelled) setSrc(value)
        return
      }
      try {
        const dataUrl = await api.questions.getImageDataUrl(question.id)
        if (!cancelled) setSrc(dataUrl)
      } catch {
        if (!cancelled) setSrc('')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [question.id, question.image_base64, question.remove_background])

  return src
}
