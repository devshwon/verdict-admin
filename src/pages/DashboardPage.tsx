import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../lib/errors';
import { listReportedVotes } from '../lib/reports';
import { listInquiries } from '../lib/inquiries';
import { listTodayPublished } from '../lib/candidates';
import { kstToday, kstYesterday, formatKstDate } from '../lib/date';
import { CATEGORY_LABEL } from '../lib/types';

interface PublishedRow {
  id: string;
  question: string;
  category: string;
  participants_count: number | null;
  author_id: string | null;
}

export function DashboardPage() {
  const [pendingReports, setPendingReports] = useState<number | null>(null);
  const [pendingInquiries, setPendingInquiries] = useState<number | null>(null);
  const [yesterdayPublished, setYesterdayPublished] = useState<PublishedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const today = kstToday();
  const yesterday = kstYesterday();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [reports, inquiries, published] = await Promise.all([
          listReportedVotes(true, 0, 100),
          listInquiries('open', 0, 100),
          listTodayPublished(yesterday),
        ]);
        if (cancelled) return;
        setPendingReports(reports.length);
        setPendingInquiries(inquiries.length);
        setYesterdayPublished(published as PublishedRow[]);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [yesterday]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>대시보드</h1>
          <div className="subtitle">오늘 ({formatKstDate(today)}) 운영 상태</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Link to="/reports" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>신고 미처리</div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              marginTop: 8,
              color:
                pendingReports && pendingReports > 0 ? 'var(--danger)' : 'var(--text)',
            }}
          >
            {loading ? '…' : pendingReports ?? 0}
          </div>
          <div style={{ color: 'var(--text-mute)', fontSize: 12, marginTop: 4 }}>
            클릭하여 큐 보기 →
          </div>
        </Link>

        <Link
          to="/inquiries"
          className="card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>문의 미처리</div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              marginTop: 8,
              color:
                pendingInquiries && pendingInquiries > 0 ? 'var(--warn)' : 'var(--text)',
            }}
          >
            {loading ? '…' : pendingInquiries ?? 0}
          </div>
          <div style={{ color: 'var(--text-mute)', fontSize: 12, marginTop: 4 }}>
            클릭하여 큐 보기 →
          </div>
        </Link>

        <Link
          to="/candidates"
          className="card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>오늘 후보 발행</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
            발행일 {formatKstDate(today)}
          </div>
          <div style={{ color: 'var(--text-mute)', fontSize: 12, marginTop: 4 }}>
            어제 후보에서 카테고리당 1건 선정 →
          </div>
        </Link>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>
          어제 발행된 today ({formatKstDate(yesterday)})
        </h2>
        {loading ? (
          <div className="empty-state">
            <span className="spinner" />
          </div>
        ) : yesterdayPublished.length === 0 ? (
          <div className="empty-state">발행된 today가 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>카테고리</th>
                <th>질문</th>
                <th>참여수</th>
                <th>작성자</th>
              </tr>
            </thead>
            <tbody>
              {yesterdayPublished.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="badge">
                      {CATEGORY_LABEL[row.category as keyof typeof CATEGORY_LABEL] ??
                        row.category}
                    </span>
                  </td>
                  <td>{row.question}</td>
                  <td>{row.participants_count ?? 0}</td>
                  <td>
                    <code style={{ fontSize: 11 }}>
                      {row.author_id ? row.author_id.slice(0, 8) : '-'}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
