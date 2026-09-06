import { useEditorStore } from "../store/editorStore";
import { buildEtDraftPayload, ET_FILE_EXTENSION, parseEtDraftJson } from "./buildEtDraftPayload";
import { api } from "../api/client";
import type { DraftFilePayload } from "../store/editorStore";

async function saveEtInBrowser(fileName: string, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const savePicker = (
    window as Window & {
      showSaveFilePicker?: (opts: {
        suggestedName?: string;
        types?: { description: string; accept: Record<string, string[]> }[];
      }) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker;

  if (typeof savePicker === "function") {
    const handle = await savePicker({
      suggestedName: fileName.endsWith(`.${ET_FILE_EXTENSION}`)
        ? fileName
        : `${fileName}.${ET_FILE_EXTENSION}`,
      types: [
        {
          description: "EDUTEST Taslak",
          accept: { "application/json": [`.${ET_FILE_EXTENSION}`] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(`.${ET_FILE_EXTENSION}`)
    ? fileName
    : `${fileName}.${ET_FILE_EXTENSION}`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Popup yok — doğrudan kayıt konumu diyaloğu. */
export async function saveEtDraftToComputer(): Promise<{ ok: boolean; canceled?: boolean }> {
  const s = useEditorStore.getState();
  const draftName = s.persistedDraftName || s.testName?.trim() || "taslak";
  const payload = buildEtDraftPayload(draftName);
  const json = JSON.stringify(payload, null, 2);
  const defaultFile = `${payload.name}.${ET_FILE_EXTENSION}`;

  if (window.electronAPI?.saveEtDialog && window.electronAPI?.saveEtFile) {
    const filePath = await window.electronAPI.saveEtDialog(defaultFile);
    if (!filePath) return { ok: false, canceled: true };
    await window.electronAPI.saveEtFile(filePath, json);
  } else {
    await saveEtInBrowser(defaultFile, json);
  }

  s.applyDraftPayload({
    name: payload.name,
    questions: payload.questions,
    editor_state: payload.editor_state,
    test_info: payload.test_info,
    export_settings: payload.export_settings,
  });
  return { ok: true };
}

async function applyLoadedDraft(draft: DraftFilePayload) {
  useEditorStore.getState().applyDraftPayload(draft);
  try {
    await api.drafts.save({
      name: draft.name || "taslak",
      questions: draft.questions,
      editor_state: draft.editor_state,
      test_info: draft.test_info,
      export_settings: draft.export_settings,
    });
  } catch {
    /* bellek yeterli */
  }
}

/** Popup yok — doğrudan .et dosya seçici. */
export async function loadEtDraftFromComputer(): Promise<{ ok: boolean; canceled?: boolean }> {
  if (window.electronAPI?.openEtDialog) {
    const opened = await window.electronAPI.openEtDialog();
    if (!opened) return { ok: false, canceled: true };
    const draft = parseEtDraftJson(opened.content);
    await applyLoadedDraft(draft);
    return { ok: true };
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `.${ET_FILE_EXTENSION},application/json`;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, canceled: true });
        return;
      }
      void file
        .text()
        .then((text) => {
          const draft = parseEtDraftJson(text);
          if (!draft.name) {
            draft.name = file.name.replace(/\.et$/i, "") || "taslak";
          }
          return applyLoadedDraft(draft);
        })
        .then(() => resolve({ ok: true }))
        .catch(() => resolve({ ok: false }));
    };
    input.click();
  });
}
