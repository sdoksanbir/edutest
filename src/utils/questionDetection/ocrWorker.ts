import { createWorker, type Worker } from 'tesseract.js'
import { QD_CONFIG } from './questionDetectionConfig'

let workerPromise: Promise<Worker> | null = null
let workerFailed = false

function tesseractPaths() {
  const base = `${window.location.origin}/tesseract`
  return {
    workerPath: `${base}/worker.min.js`,
    // Prefer wasm.js glue that loads sibling .wasm
    corePath: `${base}/tesseract-core-simd-lstm.wasm.js`,
    langPath: `${base}/lang`,
  }
}

/** Lazy singleton Tesseract worker. Never throws to callers — returns null on failure. */
export async function getOcrWorker(): Promise<Worker | null> {
  if (workerFailed) return null
  if (!workerPromise) {
    workerPromise = (async () => {
      const paths = tesseractPaths()
      console.log('[QUESTION DETECTION OCR] creating worker…', paths)
      const worker = await createWorker(QD_CONFIG.ocrLang, 1, {
        workerPath: paths.workerPath,
        corePath: paths.corePath,
        langPath: paths.langPath,
        logger: (m) => {
          if (import.meta.env.DEV && m.status) {
            console.log('[QUESTION DETECTION OCR]', m.status, m.progress ?? '')
          }
        },
      })
      console.log('[QUESTION DETECTION OCR] worker created')
      if (QD_CONFIG.ocrUseWhitelist) {
        try {
          await worker.setParameters({
            tessedit_char_whitelist: QD_CONFIG.ocrWhitelist,
          })
        } catch {
          /* whitelist optional */
        }
      }
      return worker
    })().catch((err) => {
      console.warn('[QUESTION DETECTION] Tesseract init failed', err)
      workerFailed = true
      workerPromise = null
      throw err
    })
  }
  try {
    return await workerPromise
  } catch {
    return null
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return
  try {
    const w = await workerPromise
    await w.terminate()
  } catch {
    /* ignore */
  }
  workerPromise = null
  workerFailed = false
}
