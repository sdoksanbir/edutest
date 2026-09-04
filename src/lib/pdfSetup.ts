import { GlobalWorkerOptions } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfjsWorker

export { getDocument } from 'pdfjs-dist'

/** PDF varsayılan 72 DPI; ~300 DPI eşdeğeri için ölçek */
export const PDF_RENDER_SCALE = 300 / 72
