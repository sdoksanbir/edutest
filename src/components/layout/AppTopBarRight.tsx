import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const DISPLAY_NAME_KEY = "edutest-display-name";
const APP_THEME_KEY = "edutest-app-theme";
const APP_LOCALE_KEY = "edutest-app-locale";

function loadDisplayName() {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY)?.trim() || "Serkan Doksanbir";
  } catch {
    return "Serkan Doksanbir";
  }
}

function loadAppTheme(): "light" | "dark" {
  try {
    return localStorage.getItem(APP_THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function loadLocale(): "tr" | "en" {
  try {
    return localStorage.getItem(APP_LOCALE_KEY) === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.2 1.8c0 1.8-2.7 2-2.7 3.7" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type MenuId = "help" | "user" | null;

type AppTopBarRightProps = {
  /** Sarmalayıcı olmadan yalnızca düğmeleri döndür (AppTopBar içinde kullanım). */
  bare?: boolean;
};

export default function AppTopBarRight({ bare = false }: AppTopBarRightProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [displayName] = useState(loadDisplayName);
  const [appTheme, setAppTheme] = useState(loadAppTheme);
  const [locale, setLocale] = useState(loadLocale);

  const initial = displayName.trim().charAt(0).toUpperCase() || "K";

  useEffect(() => {
    document.documentElement.dataset.edutestTheme = appTheme;
    try {
      localStorage.setItem(APP_THEME_KEY, appTheme);
    } catch {
      /* ignore */
    }
  }, [appTheme]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const toggleTheme = () => {
    setAppTheme((prev) => (prev === "light" ? "dark" : "light"));
    setOpenMenu(null);
  };

  const toggleLocale = () => {
    const next = locale === "tr" ? "en" : "tr";
    setLocale(next);
    try {
      localStorage.setItem(APP_LOCALE_KEY, next);
    } catch {
      /* ignore */
    }
    setOpenMenu(null);
  };

  const handleLogout = () => {
    setOpenMenu(null);
    const ok = window.confirm("Çıkış yapmak istiyor musunuz?");
    if (!ok) return;
    void window.electronAPI?.confirmClose?.(true);
  };

  const content = (
    <>
      <button type="button" className="tq-app-topbar__icon-btn" aria-label="Mesajlar" title="Mesajlar">
        <MailIcon />
      </button>

      <div className="tq-app-topbar__menu-wrap">
        <button
          type="button"
          className="tq-app-topbar__menu-btn"
          aria-expanded={openMenu === "help"}
          aria-haspopup="menu"
          onClick={() => setOpenMenu((prev) => (prev === "help" ? null : "help"))}
        >
          <HelpIcon />
          <span>Yardım</span>
          <ChevronDownIcon />
        </button>
        {openMenu === "help" && (
          <div className="tq-app-topbar__dropdown" role="menu">
            <button type="button" className="tq-app-topbar__dropdown-item" role="menuitem">
              Kullanım kılavuzu
            </button>
            <button type="button" className="tq-app-topbar__dropdown-item" role="menuitem">
              Sık sorulan sorular
            </button>
            <button type="button" className="tq-app-topbar__dropdown-item" role="menuitem">
              İletişim
            </button>
          </div>
        )}
      </div>

      <div className="tq-app-topbar__menu-wrap">
        <button
          type="button"
          className="tq-app-topbar__user-btn"
          aria-expanded={openMenu === "user"}
          aria-haspopup="menu"
          onClick={() => setOpenMenu((prev) => (prev === "user" ? null : "user"))}
        >
          <span className="tq-app-topbar__avatar" aria-hidden>
            {initial}
          </span>
          <span className="tq-app-topbar__user-name">{displayName}</span>
          <ChevronDownIcon />
        </button>
        {openMenu === "user" && (
          <div className="tq-app-topbar__dropdown tq-app-topbar__dropdown--user" role="menu">
            <button
              type="button"
              className="tq-app-topbar__dropdown-item"
              role="menuitem"
              onClick={() => {
                setOpenMenu(null);
                navigate("/");
              }}
            >
              <span className="tq-app-topbar__dropdown-icon" aria-hidden>
                🏠
              </span>
              Anasayfa
            </button>
            <button type="button" className="tq-app-topbar__dropdown-item" role="menuitem" onClick={toggleTheme}>
              <span className="tq-app-topbar__dropdown-icon" aria-hidden>
                🌙
              </span>
              {appTheme === "light" ? "Koyu Tema" : "Açık Tema"}
            </button>
            <button type="button" className="tq-app-topbar__dropdown-item" role="menuitem" onClick={toggleLocale}>
              <span className="tq-app-topbar__dropdown-icon" aria-hidden>
                {locale === "tr" ? "🇬🇧" : "🇹🇷"}
              </span>
              {locale === "tr" ? "English" : "Türkçe"}
            </button>
            <button type="button" className="tq-app-topbar__dropdown-item" role="menuitem">
              Çerez Ayarları
            </button>
            <button
              type="button"
              className="tq-app-topbar__dropdown-item tq-app-topbar__dropdown-item--danger"
              role="menuitem"
              onClick={handleLogout}
            >
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (bare) {
    return (
      <div ref={rootRef} className="contents">
        {content}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="tq-app-topbar__actions">
      {content}
    </div>
  );
}
