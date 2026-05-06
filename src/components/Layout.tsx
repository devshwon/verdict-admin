import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <button
        type="button"
        className="mobile-topbar__toggle"
        aria-label="메뉴 열기"
        onClick={() => setMobileOpen(true)}
      >
        <span className="mobile-topbar__icon" aria-hidden="true">☰</span>
        <span className="mobile-topbar__title">Verdict Admin</span>
      </button>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
