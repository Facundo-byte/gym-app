import { useLanguage } from "../i18n/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { Button } from "../components/Button.jsx";
import { useAuth } from "../app/useAuth.js";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/routines", label: "Routines" },
  { to: "/exercises", label: "Exercises" },
  { to: "/login", label: "Log in", account: true },
];

function NavigationLinks({ onNavigate, user, busy, onLogout }) {
  const { t } = useLanguage();
  return (
    <ul>
      {links.map(({ to, label, end, account }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={`nav-link ${account ? "nav-link--account" : ""}`}
          >
            {account && user ? t("Account") : t(label)}
          </NavLink>
        </li>
      ))}
      {user && (
        <li>
          <button
            type="button"
            disabled={busy}
            className="nav-link nav-link--account nav-link--button"
            onClick={onLogout}
          >
            {busy ? t("Logging out…") : t("Log out")}
          </button>
        </li>
      )}
    </ul>
  );
}

export default function Header() {
  const { t, language, setLanguage, preferenceError } = useLanguage();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutLock = useRef(false);
  const [openPath, setOpenPath] = useState(null);
  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const isOpen = openPath === pathname;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isOpen && event.key === "Escape") {
        setOpenPath(null);
        toggleRef.current?.focus();
      }
    };
    const handlePointerDown = (event) => {
      if (isOpen && !headerRef.current?.contains(event.target))
        setOpenPath(null);
    };
    const media = window.matchMedia("(min-width: 768px)");
    const isMobileControl = (element) =>
      element === toggleRef.current ||
      headerRef.current?.querySelector(".mobile-nav")?.contains(element);
    let previousFocus = document.activeElement;
    const handleFocus = (event) => {
      previousFocus = event.target;
    };
    const handleResize = () => {
      // CSS can hide a focused link before the media-query event runs.
      if (media.matches) {
        setOpenPath(null);
        if (isMobileControl(previousFocus))
          (
            headerRef.current?.querySelector(
              '.desktop-nav [aria-current="page"]',
            ) ?? headerRef.current?.querySelector(".brand")
          )?.focus();
      } else if (
        headerRef.current
          ?.querySelector(".desktop-nav")
          ?.contains(previousFocus)
      )
        toggleRef.current?.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocus);
    media.addEventListener("change", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocus);
      media.removeEventListener("change", handleResize);
    };
  }, [isOpen]);

  function navigateFromMenu(event) {
    setOpenPath(null);
    if (event.currentTarget.pathname === pathname) toggleRef.current?.focus();
  }

  async function logout() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      logoutLock.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <header ref={headerRef} className="site-header">
      <div className="site-header__inner">
        <Link
          className="brand"
          to="/"
          aria-label={t("FORGE home")}
          onClick={() => setOpenPath(null)}
        >
          FORGE
        </Link>
        <div className="site-header__controls">
          <nav className="desktop-nav" aria-label={t("Main navigation")}>
            <NavigationLinks user={user} onLogout={logout} busy={loggingOut} />
          </nav>
          <Button
            variant="secondary"
            className="language-toggle"
            aria-label={t(
              language === "en" ? "Switch to Spanish" : "Switch to English",
            )}
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
          >
            <span aria-hidden="true">◎</span>{" "}
            <span lang={language}>
              {language === "en" ? "English" : "Español"}
            </span>
          </Button>
          <Button
            ref={toggleRef}
            variant="secondary"
            className="menu-toggle"
            aria-label={isOpen ? t("Close navigation") : t("Open navigation")}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            onClick={() => setOpenPath(isOpen ? null : pathname)}
          >
            <span aria-hidden="true">{isOpen ? "×" : "☰"}</span>
          </Button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label={t("Mobile navigation")}
        hidden={!isOpen}
      >
        <NavigationLinks
          onNavigate={navigateFromMenu}
          user={user}
          onLogout={logout}
          busy={loggingOut}
        />
      </nav>
      {logoutError && (
        <p className="field__error header-error" role="alert">
          {t(logoutError)}
        </p>
      )}
      {preferenceError && (
        <p className="header-language-notice" role="status">
          {t(
            "Language changed for this visit. Browser storage is unavailable, so the preference could not be saved.",
          )}
        </p>
      )}
    </header>
  );
}
