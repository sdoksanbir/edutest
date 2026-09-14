import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import AppTopBar from '../layout/AppTopBar'
import ConfirmModal from '../modals/ConfirmModal'

type StorageInfo = Awaited<ReturnType<typeof api.storage.info>>

type DialogState =
  | null
  | { kind: 'restore' }
  | { kind: 'wipe-1' }
  | { kind: 'wipe-2' }
  | { kind: 'alert'; title: string; message: string; variant?: 'danger' | 'warning' }

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="tq-settings-rule" role="separator" aria-label={label}>
      <span className="tq-settings-rule__line" aria-hidden />
      <span className="tq-settings-rule__label">{label}</span>
      <span className="tq-settings-rule__line" aria-hidden />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tq-settings-stat">
      <div className="tq-settings-stat__label">{label}</div>
      <div className="tq-settings-stat__value">{value}</div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [info, setInfo] = useState<StorageInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await api.storage.info()
      setInfo(next)
    } catch (e) {
      setBanner({
        tone: 'err',
        text: e instanceof Error ? e.message : 'Depolama bilgisi alınamadı',
      })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setBanner(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setBanner({
        tone: 'err',
        text: e instanceof Error ? e.message : 'İşlem başarısız',
      })
    } finally {
      setBusy(false)
    }
  }

  const closeDialog = () => setDialog(null)

  return (
    <div className="tq-settings-page flex h-full min-h-0 flex-col overflow-hidden">
      <AppTopBar
        leftSlot={
          <button
            type="button"
            onClick={() => navigate('/')}
            className="tq-app-topbar__back"
            aria-label="Ana sayfaya dön"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Geri</span>
          </button>
        }
      />

      <div className="tq-settings-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="tq-settings-shell">
          <header className="tq-settings-hero">
            <div className="tq-settings-hero__badge" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
              </svg>
            </div>
            <div>
              <h1 className="tq-settings-hero__title">Ayarlar</h1>
              <p className="tq-settings-hero__sub">
                Verilerinizi yedekleyin, başka bilgisayara taşıyın veya sıfırlayın.
              </p>
            </div>
          </header>

          {banner ? (
            <div
              className={`tq-settings-banner tq-settings-banner--${banner.tone}`}
              role="status"
            >
              <span className="tq-settings-banner__text">{banner.text}</span>
              <button
                type="button"
                className="tq-settings-banner__close"
                onClick={() => setBanner(null)}
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
          ) : null}

          <SectionRule label="Depolama" />

          <section className="tq-settings-card">
            <div className="tq-settings-card__head">
              <h2 className="tq-settings-card__title">Yerel veri klasörü</h2>
              <p className="tq-settings-card__desc">
                Soru bankası, PDF’ler ve taslaklar bu konumda tutulur.
              </p>
            </div>
            <div className="tq-settings-path" title={info?.path}>
              <code>{info?.path ?? '…'}</code>
            </div>
            <div className="tq-settings-stats">
              <StatCard label="Banka soruları" value={info?.bankQuestionCount ?? '—'} />
              <StatCard label="PDF" value={info?.pdfCount ?? '—'} />
              <StatCard label="Taslak" value={info?.draftCount ?? '—'} />
              <StatCard label="Banka görseli" value={info?.bankImageCount ?? '—'} />
              <StatCard label="Oturum görseli" value={info?.sessionImageCount ?? '—'} />
              <StatCard
                label="Yaklaşık boyut"
                value={info ? formatBytes(info.approxBytes) : '—'}
              />
            </div>
            <div className="tq-settings-actions">
              <button
                type="button"
                disabled={busy}
                className="tq-settings-btn tq-settings-btn--ghost"
                onClick={() =>
                  void run(async () => {
                    await api.storage.openFolder()
                    setBanner({ tone: 'ok', text: 'Depolama klasörü açıldı.' })
                  })
                }
              >
                Klasörü aç
              </button>
              <button
                type="button"
                disabled={busy}
                className="tq-settings-btn tq-settings-btn--ghost"
                onClick={() => void refresh()}
              >
                Yenile
              </button>
            </div>
          </section>

          <SectionRule label="Yedek / taşıma" />

          <section className="tq-settings-card">
            <div className="tq-settings-card__head">
              <h2 className="tq-settings-card__title">Bilgisayarlar arası aktarım</h2>
              <p className="tq-settings-card__desc">
                Tüm banka, PDF, taslak ve görseller bir klasöre kopyalanır. Diğer bilgisayarda
                «Geri yükle» ile aynı klasörü seçin.
              </p>
            </div>
            <div className="tq-settings-actions">
              <button
                type="button"
                disabled={busy}
                className="tq-settings-btn tq-settings-btn--primary"
                onClick={() =>
                  void run(async () => {
                    const res = await api.storage.exportBackup()
                    if (res.canceled) {
                      setBanner({ tone: 'ok', text: 'Yedekleme iptal edildi.' })
                      return
                    }
                    setDialog({
                      kind: 'alert',
                      title: 'Yedek hazır',
                      message: `Yedek klasörü oluşturuldu:\n${res.path}`,
                      variant: 'warning',
                    })
                  })
                }
              >
                Yedek al…
              </button>
              <button
                type="button"
                disabled={busy}
                className="tq-settings-btn tq-settings-btn--ghost"
                onClick={() => setDialog({ kind: 'restore' })}
              >
                Yedekten geri yükle…
              </button>
            </div>
          </section>

          <SectionRule label="Tehlikeli bölge" />

          <section className="tq-settings-card tq-settings-card--danger">
            <div className="tq-settings-card__head">
              <h2 className="tq-settings-card__title tq-settings-card__title--danger">
                Tüm verileri sil
              </h2>
              <p className="tq-settings-card__desc">
                Soru bankası, PDF’ler, taslaklar, görseller ve Drive oturum dosyaları silinir. Bu
                işlem geri alınamaz — önce yedek alın.
              </p>
            </div>
            <div className="tq-settings-actions">
              <button
                type="button"
                disabled={busy}
                className="tq-settings-btn tq-settings-btn--danger"
                onClick={() => setDialog({ kind: 'wipe-1' })}
              >
                Tüm verileri sıfırla…
              </button>
            </div>
          </section>

          <SectionRule label="Yakında" />

          <section className="tq-settings-card tq-settings-card--muted">
            <ul className="tq-settings-soon">
              <li>Yedek ile mevcut veri fark özeti</li>
              <li>Otomatik soru algılama (şimdilik gizli)</li>
            </ul>
          </section>
        </div>
      </div>

      <ConfirmModal
        open={dialog?.kind === 'restore'}
        title="Yedekten geri yükle?"
        message="Geri yükleme mevcut tüm yerel verilerin üzerine yazacak. Devam etmek istiyor musunuz?"
        confirmLabel="Geri yükle"
        cancelLabel="Vazgeç"
        variant="warning"
        onCancel={closeDialog}
        onConfirm={() => {
          closeDialog()
          void run(async () => {
            const res = await api.storage.importBackup()
            if (res.canceled) {
              setBanner({ tone: 'ok', text: 'Geri yükleme iptal edildi.' })
              return
            }
            setDialog({
              kind: 'alert',
              title: 'Geri yükleme tamam',
              message: `Yedek geri yüklendi. Uygulamayı yeniden başlatmanız önerilir.\nKaynak: ${res.path}`,
              variant: 'warning',
            })
          })
        }}
      />

      <ConfirmModal
        open={dialog?.kind === 'wipe-1'}
        title="Tüm veriler silinsin mi?"
        message="TÜM yerel veriler silinecek. Bu işlem geri alınamaz."
        confirmLabel="Devam et"
        cancelLabel="Vazgeç"
        variant="danger"
        onCancel={closeDialog}
        onConfirm={() => setDialog({ kind: 'wipe-2' })}
      />

      <ConfirmModal
        open={dialog?.kind === 'wipe-2'}
        title="Son onay"
        message="Gerçekten her şeyi silmek istiyor musunuz? Soru bankası, PDF’ler ve taslaklar kalıcı olarak silinir."
        confirmLabel="Evet, sıfırla"
        cancelLabel="Vazgeç"
        variant="danger"
        onCancel={closeDialog}
        onConfirm={() => {
          closeDialog()
          void run(async () => {
            await api.storage.wipeAll()
            setDialog({
              kind: 'alert',
              title: 'Veriler sıfırlandı',
              message: 'Tüm yerel veriler silindi. Sayfayı yenileyin veya uygulamayı yeniden başlatın.',
              variant: 'warning',
            })
          })
        }}
      />

      <ConfirmModal
        open={dialog?.kind === 'alert'}
        title={dialog?.kind === 'alert' ? dialog.title : ''}
        message={dialog?.kind === 'alert' ? dialog.message : ''}
        mode="alert"
        confirmLabel="Tamam"
        variant={dialog?.kind === 'alert' ? dialog.variant ?? 'warning' : 'warning'}
        onCancel={closeDialog}
        onConfirm={closeDialog}
      />
    </div>
  )
}
