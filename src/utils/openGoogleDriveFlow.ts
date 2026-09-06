import { api } from "../api/client";
import type { ModalKey } from "../types";

/** Drive butonu: önce Google hesap popup'ı, ardından dosya seçim modalı. */
export async function openGoogleDriveFlow(
  setOpenModal: (key: Exclude<ModalKey, null> | null) => void
): Promise<void> {
  const status = await api.drive.status();
  if (!status.configured) {
    setOpenModal("google-drive");
    return;
  }
  if (!status.signedIn) {
    try {
      await api.drive.signIn();
    } catch {
      /* Modal hata mesajını gösterir */
    }
  }
  setOpenModal("google-drive");
}
