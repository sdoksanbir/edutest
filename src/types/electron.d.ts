export interface ElectronAPI {
  ping?: () => Promise<string>
  apiRequest?: (method: string, payload?: unknown) => Promise<unknown>
  savePdfDialog?: (defaultName: string) => Promise<string | null>
  savePdfFile?: (filePath: string, base64: string) => Promise<{ ok: boolean }>
  saveEtDialog?: (defaultName: string) => Promise<string | null>
  saveEtFile?: (filePath: string, utf8: string) => Promise<{ ok: boolean; filePath: string }>
  openEtDialog?: () => Promise<{ filePath: string; content: string } | null>
  onBeforeClose?: (callback: () => void) => void
  confirmClose?: (allow: boolean) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
