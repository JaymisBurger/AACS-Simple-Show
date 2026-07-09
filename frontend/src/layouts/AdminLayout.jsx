import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogoutButton } from '../components/LogoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { adminSearchRequest, getNotificationsRequest } from '../services/opsService.js';

const primaryNavItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Vendor', to: '/admin/vendors' },
  { label: 'Shows', to: '/admin/shows' }
];

const extrasNavItems = [
  { label: 'Booth Assignments', to: '/admin/booth-assignments' },
  { label: 'Readiness', to: '/admin/shows' },
  { label: 'Notifications', to: '/admin/notifications' },
  { label: 'Release Notes', to: '/admin/release-notes' },
  { label: 'QA Checklist', to: '/admin/qa-checklist' },
  { label: 'Settings', to: '/admin/qa-checklist' },
  { label: 'Help', to: '/admin/help' }
];

export function AdminLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const extrasActive = extrasNavItems.some((item) => location.pathname === item.to);
  const [menuOpen, setMenuOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(extrasActive);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [noticeCount, setNoticeCount] = useState(0);

  useEffect(() => {
    getNotificationsRequest().then((data) => setNoticeCount(data.count || 0)).catch(() => setNoticeCount(0));
  }, []);

  useEffect(() => {
    if (extrasActive) setExtrasOpen(true);
  }, [extrasActive]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      adminSearchRequest(query).then((data) => setResults(data.results || [])).catch(() => setResults([]));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className={`admin-shell ${menuOpen ? 'menu-open' : ''}`}>
      <button
        aria-label={menuOpen ? 'Close admin menu' : 'Open admin menu'}
        className="admin-menu-toggle"
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
      {menuOpen ? (
        <button
          aria-label="Close admin menu"
          className="admin-menu-overlay"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}
      <aside className="sidebar">
        <div>
          <p className="app-kicker">AACS Events</p>
          <h1>Admin Dashboard</h1>
        </div>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          {primaryNavItems.map((item) => (
            <NavLink end={item.to === '/admin'} key={item.label} onClick={() => setMenuOpen(false)} to={item.to}>
              {item.label}
            </NavLink>
          ))}
          <button
            className={extrasOpen || extrasActive ? 'active' : ''}
            onClick={() => setExtrasOpen((current) => !current)}
            type="button"
          >
            Extras
          </button>
          {extrasOpen ? (
            <div className="sidebar-subnav">
              {extrasNavItems.map((item) => (
                <NavLink key={item.label} onClick={() => setMenuOpen(false)} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ) : null}
        </nav>
        <div className="sidebar-footer">
          <span>{user.email}</span>
          <LogoutButton />
        </div>
      </aside>
      <main className="dashboard-main">
        <section className="admin-topbar no-print">
          <div className="admin-search">
            <label>
              <span className="sr-only">Global admin search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shows, vendors, booths, assignments" />
            </label>
            {results.length ? (
              <div className="admin-search-results">
                {results.map((result) => <Link key={`${result.type}-${result.id}`} to={result.url} onClick={() => { setQuery(''); setResults([]); }}><strong>{result.type}</strong><span>{result.title}</span><small>{result.context}</small></Link>)}
              </div>
            ) : null}
          </div>
          <Link className="notification-link" to="/admin/notifications">Notifications {noticeCount ? <span>{noticeCount}</span> : null}</Link>
        </section>
        {children}
      </main>
    </div>
  );
}
