import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping') as Promise<string>,
  apiRequest: (method: string, payload?: unknown) =>
    ipcRenderer.invoke('tq-api', method, payload) as Promise<unknown>,
  savePdfDialog: (defaultName: string) =>
    ipcRenderer.invoke('save-pdf-dialog', defaultName) as Promise<string | null>,
  savePdfFile: (filePath: string, base64: string) =>
    ipcRenderer.invoke('save-pdf-file', filePath, base64) as Promise<{ ok: boolean }>,
  saveEtDialog: (defaultName: string) =>
    ipcRenderer.invoke('save-et-dialog', defaultName) as Promise<string | null>,
  saveEtFile: (filePath: string, utf8: string) =>
    ipcRenderer.invoke('save-et-file', filePath, utf8) as Promise<{ ok: boolean; filePath: string }>,
  openEtDialog: () =>
    ipcRenderer.invoke('open-et-dialog') as Promise<{ filePath: string; content: string } | null>,
  onBeforeClose: (callback: () => void) => {
    ipcRenderer.on('before-close-request', callback)
  },
  confirmClose: (allow: boolean) => ipcRenderer.invoke('confirm-close', allow),
})
