import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

interface NavItem {
  to: string;
  label: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/dashboard', label: '대시보드' },
      { to: '/candidates', label: '오늘 후보' },
      { to: '/votes', label: '투표 관리' },
      { to: '/reports', label: '신고 처리' },
      { to: '/inquiries', label: '문의사항' },
      { to: '/users', label: '사용자 관리' },
    ],
  },
  {
    title: '컨텐츠 생성',
    items: [{ to: '/create/normal-votes', label: '일반투표 생성기' }],
  },
  {
    title: '운영 설정',
    items: [
      { to: '/config/toss-promotions', label: '토스 프로모션 매핑' },
      { to: '/config/settings', label: '통합 설정' },
      { to: '/config/system-status', label: '시스템 상태' },
      { to: '/config/audit-log', label: '감사 로그' },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <aside className={`sidebar${mobileOpen ? ' is-open' : ''}`}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: '#fff' }}>
        Verdict Admin
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {NAV_SECTIONS.map((section, sIdx) => (
          <div
            key={sIdx}
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {section.title && (
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  padding: '4px 12px',
                  marginTop: 4,
                }}
              >
                {section.title}
              </div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 14,
                  color: isActive ? '#fff' : '#cbd5e1',
                  background: isActive ? 'rgba(37,99,235,0.25)' : 'transparent',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, wordBreak: 'break-all' }}>
        {email}
      </div>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.assign(`${import.meta.env.BASE_URL}login`);
        }}
        style={{
          background: 'transparent',
          color: '#cbd5e1',
          border: '1px solid #334155',
        }}
      >
        로그아웃
      </button>
    </aside>
  );
}
