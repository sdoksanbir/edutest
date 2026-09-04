import type {
  CropBox,
  DraftInfo,
  PdfFolder,
  PdfItem,
  QuestionContentType,
  QuestionItem,
} from '../types'

export type LayoutItem = {
  kind?: string
  page?: number
  question_id?: string
  order_index: number
  page_num: number
  x_pt: number
  y_top_pt: number
  w_pt: number
  h_pt: number
  img_x_pt?: number
  img_y_top_pt?: number
  img_w_pt?: number
  img_h_pt?: number
  image_base64?: string
  image_b64?: string
  answer_key?: string
  section?: {
    title: string
    fill_color: string
    text_color: string
    line_color: string
    font_pt: number
    box_h: number
    gap_after: number
  }
  display_number?: number | null
  content_type?: string
  explanation_caption?: {
    lines: string[]
    align: string
    font_pt: number
    leading_pt: number
    x_pt: number
    y_top_pt: number
    w_pt: number
    h_pt: number
    color_hex?: string
    bold?: boolean
    italic?: boolean
    single_line?: string
    rotate_deg?: number
    pivot_x_pt?: number
    pivot_y_pt?: number
    box_enabled?: boolean
    box_fill_hex?: string
    box_rounded?: boolean
    box_tight?: boolean
    box_bg_x_pt?: number
    box_bg_w_pt?: number
  } | null
  num_slot_w_pt?: number
  column_index?: number
  height_pt?: number
  width_pt?: number
}

import {
  DEFAULT_PDF_RENDER_DPI,
  loadPdfFromBytes,
  renderPageToDataUrl,
} from '../utils/pdfClient'

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

async function invoke<T>(method: string, payload?: unknown): Promise<T> {
  if (!window.electronAPI?.apiRequest) {
    throw new Error('Electron API kullanılamıyor. Uygulamayı Electron ile başlatın.')
  }
  return window.electronAPI.apiRequest(method, payload) as Promise<T>
}

export const api = {
  async health() {
    return invoke<{ ok: boolean }>('health')
  },

  pdfs: {
    list: () => invoke<{ items: PdfItem[] }>('pdfs:list'),
    upload: async (files: File[], folderId?: string | null) => {
      const encoded = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await fileToBase64(file),
        })),
      )
      return invoke<{ items: PdfItem[] }>('pdfs:upload', { files: encoded, folderId })
    },
    remove: (pdfId: string) => invoke<{ ok: boolean }>('pdfs:delete', { pdfId }),
    delete: (pdfId: string) => invoke<{ ok: boolean }>('pdfs:delete', { pdfId }),
    move: (pdfId: string, folderId: string | null) =>
      invoke<{ item: PdfItem }>('pdfs:move', { pdfId, folderId }),
    folders: {
      list: () => invoke<{ folders: PdfFolder[] }>('pdfs:folders:list'),
      create: (name: string, parentId?: string | null) =>
        invoke<{ folder: PdfFolder }>('pdfs:folders:create', { name, parentId }),
      delete: (folderId: string) => invoke<{ ok: boolean }>('pdfs:folders:delete', { folderId }),
    },
    getPageImageDataUrl: async (
      pdfId: string,
      pageNumber: number,
      opts?: { dpi?: number; zoom?: number },
    ) => {
      const dpi =
        opts?.dpi ??
        (opts?.zoom != null
          ? Math.round((opts.zoom / 100) * 72)
          : DEFAULT_PDF_RENDER_DPI)
      const b64 = await invoke<string>('pdfs:getBytes', { pdfId })
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const { doc } = await loadPdfFromBytes(bytes.buffer)
      return renderPageToDataUrl(doc, pageNumber, dpi)
    },
    pageImageUrl: (pdfId: string, pageNumber: number, opts?: { dpi?: number; zoom?: number }) =>
      `tq-pdf://${pdfId}/${pageNumber}?dpi=${opts?.dpi ?? DEFAULT_PDF_RENDER_DPI}`,
  },

  questions: {
    list: () => invoke<{ items: QuestionItem[] }>('questions:list'),
    create: (payload: {
      pdf_id: string
      page_number: number
      crop: CropBox
      answer_key: string
    }) => invoke<QuestionItem>('questions:create', payload),
    createFromLocalPdf: (payload: Record<string, unknown>) =>
      invoke<QuestionItem>('questions:createLocal', payload),
    updateAnswer: (id: string, answer_key: string) =>
      invoke<QuestionItem>('questions:updateAnswer', { id, answer_key }),
    updateCrop: (id: string, crop: CropBox) =>
      invoke<QuestionItem>('questions:updateCrop', { id, crop }),
    updateContentType: (id: string, content_type: QuestionContentType) =>
      invoke<QuestionItem>('questions:updateContentType', { id, content_type }),
    updateExplanationCaption: (id: string, payload: Record<string, unknown>) =>
      invoke<QuestionItem>('questions:updateExplanationCaption', { id, body: payload }),
    updateRemoveBackground: (id: string, remove_background: boolean) =>
      invoke<QuestionItem>('questions:updateRemoveBackground', { id, remove_background }),
    reorder: (ordered_ids: string[]) =>
      invoke<{ items: QuestionItem[] }>('questions:reorder', { ordered_ids }),
    remove: (id: string) => invoke<{ ok: boolean }>('questions:delete', { id }),
    delete: (id: string) => invoke<{ ok: boolean }>('questions:delete', { id }),
    clearAll: () => invoke<{ ok: true }>('questions:clearAll'),
    getImageDataUrl: async (id: string) => {
      const b64 = await invoke<string>('questions:getImage', { id })
      return `data:image/png;base64,${b64}`
    },
    imageUrl: (id: string) => `tq-question://${id}`,
  },

  drafts: {
    list: () => invoke<{ items: DraftInfo[] }>('drafts:list'),
    save: (payload: Record<string, unknown>) => invoke<DraftInfo>('drafts:save', payload),
    load: (name: string) => invoke<Record<string, unknown>>('drafts:load', { name }),
    delete: (name: string) => invoke<{ ok: true }>('drafts:delete', { name }),
  },

  drive: {
    status: () =>
      invoke<{ configured: boolean; signedIn: boolean; clientId: string }>('drive:status'),
    setClientId: (clientId: string) =>
      invoke<{ configured: boolean; signedIn: boolean; clientId: string }>('drive:setClientId', {
        clientId,
      }),
    importCredentials: () =>
      invoke<
        { configured: boolean; signedIn: boolean; clientId: string; canceled?: boolean }
      >('drive:importCredentials'),
    signIn: () => invoke<{ ok: true }>('drive:signIn'),
    signOut: () => invoke<{ ok: true }>('drive:signOut'),
    listPdfs: (query?: string) =>
      invoke<{ items: Array<{ id: string; name: string; modifiedTime?: string; size?: string }> }>(
        'drive:listPdfs',
        { query },
      ),
    downloadPdf: (fileId: string) =>
      invoke<{ name: string; data: string }>('drive:downloadPdf', { fileId }),
  },

  exports: {
    layout: (payload: Record<string, unknown>) =>
      invoke<{ layout: LayoutItem[]; page_w_pt: number; page_h_pt: number }>(
        'exports:layout',
        payload,
      ),
    fromQuestions: async (payload: Record<string, unknown>) => {
      const b64 = await invoke<string>('exports:fromQuestions', payload)
      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      return new Blob([binary], { type: 'application/pdf' })
    },
    simple: async (payload: Record<string, unknown>) => {
      const blob = await api.exports.fromQuestions(payload)
      return { path: URL.createObjectURL(blob) }
    },
  },
}
