import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../features/theme";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import { enumLabel } from "../../../shared/i18n/labels";
import UserAvatar from "../../../entities/user/ui/UserAvatar";

export default function Header() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState({ positions: [], cvs: [] });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setSuggestionsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions({ positions: [], cvs: [] });
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);
    const timer = setTimeout(() => {
      apiFetch(`/api/dashboard/search?q=${encodeURIComponent(q)}`, {
        token: accessToken || undefined,
      })
        .then((data) => {
          if (!cancelled) {
            setSuggestions({
              positions: (data.positions || []).slice(0, 5),
              cvs: (data.cvs || []).slice(0, 3),
            });
          }
        })
        .catch(() => {
          if (!cancelled) setSuggestions({ positions: [], cvs: [] });
        })
        .finally(() => {
          if (!cancelled) setSuggestionsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, accessToken]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!searchRef.current?.contains(event.target)) setSuggestionsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    setSuggestionsOpen(false);
    setMenuOpen(false);
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  function switchLang(lng) {
    i18n.changeLanguage(lng);
  }

  const navItems = [
    { to: "/", label: t("nav.home"), icon: "bi-grid-1x2", end: true },
    { to: "/positions", label: t("nav.positions"), icon: "bi-briefcase" },
  ];

  const manageItems = [];
  if (user && (user.role === "RECRUITER" || user.role === "ADMIN")) {
    manageItems.push({
      to: "/attributes",
      label: t("nav.attributes"),
      icon: "bi-sliders2",
    });
  }
  if (user?.role === "ADMIN") {
    manageItems.push({
      to: "/admin/users",
      label: t("nav.users"),
      icon: "bi-people",
    });
  }

  const headerBusy = manageItems.length > 0;
  const manageActive = manageItems.some(
    (item) =>
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  );

  return (
    <header
      className={`app-header${headerBusy ? " app-header--busy" : ""}${
        menuOpen ? " app-header--open" : ""
      }`}
    >
      <nav className="navbar navbar-expand-xl" aria-label={t("header.menu")}>
        <div className="container-fluid app-shell app-header__inner">
          <div className="app-header__top">
            <Link className="app-brand" to="/" aria-label={t("appName")}>
              <img
                className="app-brand__logo"
                src="/talentdesk-logo.svg"
                alt=""
                width="40"
                height="40"
              />
              <span className="app-brand__name">TalentDesk</span>
            </Link>

            <div className="app-header__top-actions">
              <button
                type="button"
                className="icon-button app-header__theme-quick"
                onClick={toggleTheme}
                title={theme === "light" ? t("header.themeDark") : t("header.themeLight")}
              >
                <i
                  className={`bi ${theme === "light" ? "bi-moon-stars" : "bi-sun"}`}
                  aria-hidden="true"
                />
              </button>

              <button
                className={`navbar-toggler app-header__toggler${menuOpen ? "" : " collapsed"}`}
                type="button"
                aria-controls={menuId}
                aria-expanded={menuOpen}
                aria-label={t("header.menu")}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <i className={`bi ${menuOpen ? "bi-x-lg" : "bi-list"}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className={`app-header__panel navbar-collapse${menuOpen ? " show" : ""}`}
            id={menuId}
          >
            <ul className="navbar-nav app-nav">
              {navItems.map((item) => (
                <li className="nav-item" key={item.to}>
                  <NavLink className="nav-link" to={item.to} end={item.end}>
                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}

              {manageItems.map((item) => (
                <li className="nav-item app-nav__mobile-item" key={`mobile-${item.to}`}>
                  <NavLink className="nav-link" to={item.to}>
                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}

              {manageItems.length > 0 && (
                <li className="nav-item dropdown app-nav__desktop-manage">
                  <button
                    type="button"
                    className={`nav-link dropdown-toggle app-nav__manage${
                      manageActive ? " active" : ""
                    }`}
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="bi bi-gear" aria-hidden="true" />
                    <span>{t("nav.manage")}</span>
                  </button>
                  <ul className="dropdown-menu app-nav-dropdown">
                    {manageItems.map((item) => (
                      <li key={item.to}>
                        <NavLink className="dropdown-item" to={item.to}>
                          <i className={`bi ${item.icon}`} aria-hidden="true" />
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>

            <form
              className="app-search"
              onSubmit={handleSearch}
              role="search"
              ref={searchRef}
            >
              <i className="bi bi-search app-search__icon" aria-hidden="true" />
              <input
                className="app-search__input"
                type="search"
                placeholder={t("header.searchPlaceholder")}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => query.trim().length >= 2 && setSuggestionsOpen(true)}
                aria-label={t("header.search")}
              />
              <button className="app-search__submit" type="submit" title={t("header.search")}>
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>

              {suggestionsOpen && query.trim().length >= 2 && (
                <div className="search-suggestions">
                  {suggestionsLoading ? (
                    <div className="search-suggestions__loading" aria-label={t("header.searching")}>
                      {[0, 1, 2].map((item) => (
                        <span key={item} />
                      ))}
                    </div>
                  ) : (
                    <>
                      {suggestions.positions.length > 0 && (
                        <div className="suggestion-group">
                          <div className="suggestion-group__title">{t("search.positions")}</div>
                          {suggestions.positions.map((position) => (
                            <Link
                              className="suggestion-item"
                              to={`/positions/${position.id}`}
                              onClick={() => setSuggestionsOpen(false)}
                              key={position.id}
                            >
                              <span className="suggestion-item__icon">
                                <i className="bi bi-briefcase" aria-hidden="true" />
                              </span>
                              <span className="suggestion-item__copy">
                                <strong>{position.title}</strong>
                                <small>
                                  {[
                                    position.company,
                                    position.level
                                      ? enumLabel(t, "positionLevels", position.level)
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </small>
                              </span>
                              <i className="bi bi-chevron-right" aria-hidden="true" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {suggestions.cvs.length > 0 && (
                        <div className="suggestion-group">
                          <div className="suggestion-group__title">{t("search.cvs")}</div>
                          {suggestions.cvs.map((cv) => (
                            <Link
                              className="suggestion-item"
                              to={`/cvs/${cv.id}`}
                              onClick={() => setSuggestionsOpen(false)}
                              key={cv.id}
                            >
                              <span className="suggestion-item__icon">
                                <i className="bi bi-file-earmark-person" aria-hidden="true" />
                              </span>
                              <span className="suggestion-item__copy">
                                <strong>{cv.candidate.name || cv.candidate.email}</strong>
                                <small>{cv.position.title}</small>
                              </span>
                              <i className="bi bi-chevron-right" aria-hidden="true" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {!suggestions.positions.length && !suggestions.cvs.length && (
                        <div className="search-suggestions__empty">
                          <i className="bi bi-search" aria-hidden="true" />
                          {t("header.noSuggestions")}
                        </div>
                      )}
                    </>
                  )}

                  <Link
                    className="search-suggestions__all"
                    to={`/search?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => setSuggestionsOpen(false)}
                  >
                    {t("header.viewAll")}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </form>

            <div className="app-header__tools">
              <div className="language-switch" role="group" aria-label={t("header.language")}>
                {["ru", "en"].map((lng) => (
                  <button
                    type="button"
                    className={
                      i18n.resolvedLanguage === lng || i18n.language?.startsWith(lng)
                        ? "active"
                        : ""
                    }
                    onClick={() => switchLang(lng)}
                    key={lng}
                  >
                    {lng.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="icon-button app-header__theme-panel"
                onClick={toggleTheme}
                title={theme === "light" ? t("header.themeDark") : t("header.themeLight")}
              >
                <i
                  className={`bi ${theme === "light" ? "bi-moon-stars" : "bi-sun"}`}
                  aria-hidden="true"
                />
              </button>

              {user ? (
                <div className="user-menu">
                  <NavLink className="user-menu__profile" to="/profile">
                    <UserAvatar
                      className="user-menu__avatar"
                      url={user.avatarUrl}
                      name={user.name}
                      email={user.email}
                    />
                    <span className="user-menu__copy">
                      <strong>{user.name || user.email}</strong>
                      <small>{enumLabel(t, "roles", user.role)}</small>
                    </span>
                  </NavLink>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={logout}
                    title={t("auth.logout")}
                  >
                    <i className="bi bi-box-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <NavLink className="btn btn-primary app-login" to="/login">
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                  <span>{t("nav.login")}</span>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
