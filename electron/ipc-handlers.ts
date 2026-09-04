import { BrowserWindow, dialog, ipcMain } from 'electron'
import * as draftStore from './services/draft-store.js'
import * as exportService from './services/export-service.js'
import * as googleDrive from './services/google-drive.js'
import * as pdfStore from './services/pdf-store.js'
import * as questionStore from './services/question-store.js'
import type { CropBox } from './services/question-store.js'
import { initStoragePaths } from './services/paths.js'

export function registerIpcHandlers(storageDir: string) {
  initStoragePaths(storageDir)
  googleDrive.initGoogleDriveStorage(storageDir)

  ipcMain.handle('tq-api', async (_event, method: string, payload: unknown) => {
    switch (method) {
      case 'health':
        return { ok: true }

      case 'pdfs:list':
        return { items: await pdfStore.listPdfs() }

      case 'pdfs:upload': {
        const { files, folderId } = payload as {
          files: Array<{ name: string; data: string }>
          folderId?: string | null
        }
        const buffers = files.map((f) => ({
          name: f.name,
          data: Buffer.from(f.data, 'base64'),
        }))
        return { items: await pdfStore.uploadPdfs(buffers, folderId) }
      }

      case 'pdfs:getBytes': {
        const { pdfId } = payload as { pdfId: string }
        return pdfStore.getPdfBytes(pdfId)
      }

      case 'pdfs:delete': {
        const { pdfId } = payload as { pdfId: string }
        pdfStore.deletePdf(pdfId)
        return { ok: true }
      }

      case 'pdfs:folders:list':
        return { folders: pdfStore.listFolders() }

      case 'pdfs:folders:create': {
        const { name, parentId } = payload as { name: string; parentId?: string | null }
        return { folder: pdfStore.createFolder(name, parentId) }
      }

      case 'pdfs:folders:delete': {
        const { folderId } = payload as { folderId: string }
        return pdfStore.deleteFolder(folderId)
      }

      case 'pdfs:move': {
        const { pdfId, folderId } = payload as { pdfId: string; folderId: string | null }
        return { item: pdfStore.movePdf(pdfId, folderId) }
      }

      case 'questions:list':
        return { items: questionStore.listQuestions() }

      case 'questions:create':
        return questionStore.createFromPdf(payload as Parameters<typeof questionStore.createFromPdf>[0])

      case 'questions:createLocal':
        return questionStore.createFromLocalPdf(
          payload as Parameters<typeof questionStore.createFromLocalPdf>[0],
        )

      case 'questions:updateAnswer': {
        const { id, answer_key } = payload as { id: string; answer_key: string }
        return questionStore.updateAnswer(id, answer_key)
      }

      case 'questions:updateCrop': {
        const { id, crop } = payload as { id: string; crop: CropBox }
        return questionStore.updateCrop(id, crop)
      }

      case 'questions:updateContentType': {
        const { id, content_type } = payload as {
          id: string
          content_type: 'question' | 'explanation'
        }
        return questionStore.updateContentType(id, content_type)
      }

      case 'questions:updateRemoveBackground': {
        const { id, remove_background } = payload as { id: string; remove_background: boolean }
        return questionStore.updateRemoveBackground(id, remove_background)
      }

      case 'questions:updateExplanationCaption': {
        const { id, body } = payload as { id: string; body: Record<string, unknown> }
        return questionStore.updateExplanationCaption(id, body)
      }

      case 'questions:reorder': {
        const { ordered_ids } = payload as { ordered_ids: string[] }
        return { items: questionStore.reorder(ordered_ids) }
      }

      case 'questions:delete': {
        const { id } = payload as { id: string }
        questionStore.remove(id)
        return { ok: true }
      }

      case 'questions:clearAll': {
        questionStore.clearAll()
        return { ok: true }
      }

      case 'questions:getImage': {
        const { id } = payload as { id: string }
        return questionStore.getImageBase64(id)
      }

      case 'drafts:list':
        return { items: draftStore.listDrafts() }

      case 'drafts:save': {
        const draft = payload as draftStore.DraftPayload
        const info = draftStore.saveDraft(draft)
        questionStore.replaceAll(draft.questions)
        return info
      }

      case 'drafts:load': {
        const { name } = payload as { name: string }
        const draft = draftStore.loadDraft(name)
        questionStore.replaceAll(draft.questions)
        return draft
      }

      case 'drafts:delete': {
        const { name } = payload as { name: string }
        return draftStore.deleteDraft(name)
      }

      case 'exports:layout': {
        const enriched = exportService.enrichExportPayload(payload as Record<string, unknown>)
        return exportService.computeLayout(enriched)
      }

      case 'exports:fromQuestions': {
        const enriched = exportService.enrichExportPayload(payload as Record<string, unknown>)
        const bytes = await exportService.exportPdf(enriched)
        return Buffer.from(bytes).toString('base64')
      }

      case 'drive:status':
        return googleDrive.getDriveAuthStatus()

      case 'drive:setClientId': {
        const { clientId } = payload as { clientId: string }
        googleDrive.setDriveClientId(clientId)
        return googleDrive.getDriveAuthStatus()
      }

      case 'drive:importCredentials': {
        const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
        const result = await dialog.showOpenDialog(parent ?? undefined, {
          title: 'Google OAuth kimlik dosyası',
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['openFile'],
        })
        if (result.canceled || !result.filePaths[0]) {
          return { canceled: true, ...googleDrive.getDriveAuthStatus() }
        }
        const status = googleDrive.importDriveCredentials(result.filePaths[0])
        return { canceled: false, ...status }
      }

      case 'drive:signIn':
        return googleDrive.signInToDrive()

      case 'drive:signOut':
        googleDrive.signOutFromDrive()
        return { ok: true }

      case 'drive:listPdfs': {
        const { query } = (payload ?? {}) as { query?: string }
        return { items: await googleDrive.listDrivePdfFiles(query) }
      }

      case 'drive:downloadPdf': {
        const { fileId } = payload as { fileId: string }
        return googleDrive.downloadDrivePdf(fileId)
      }

      default:
        throw new Error(`Unknown API method: ${method}`)
    }
  })
}
