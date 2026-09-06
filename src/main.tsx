import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './styles.css'
import App from './App.tsx'
import { useEditorStore } from './store/editorStore'

function Root() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem("edutest-app-theme");
      if (theme === "dark") document.documentElement.dataset.edutestTheme = "dark";
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    window.electronAPI?.onBeforeClose?.(() => {
      const isDirty = useEditorStore.getState().isDirty
      if (!isDirty) {
        void window.electronAPI?.confirmClose?.(true)
        return
      }
      const ok = window.confirm('Kaydedilmemiş değişiklikler var. Çıkmak istiyor musunuz?')
      void window.electronAPI?.confirmClose?.(ok)
    })
  }, [])

  return (
    <HashRouter>
      <App />
    </HashRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
