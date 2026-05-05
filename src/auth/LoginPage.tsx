import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { errorMessage } from '../lib/errors';

export function LoginPage() {
  const [params] = useSearchParams();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('error') === 'not_admin') {
      setError(
        '관리자 권한이 없는 계정입니다. 운영자에게 권한 부여(`is_admin=true`)를 요청하세요.'
      );
    }
  }, [params]);

  async function signInWithGitHub() {
    setSigning(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo },
      });
      if (error) throw error;
      // 정상 흐름이면 이 시점에 GitHub 로 redirect
    } catch (err) {
      setError(errorMessage(err));
      setSigning(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Verdict Admin</h1>
        <p style={{ color: 'var(--text-mute)', marginTop: 0, marginBottom: 20 }}>
          GitHub 계정으로 로그인하세요. 등록된 관리자만 접근할 수 있습니다.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <button
          type="button"
          className="primary"
          onClick={signInWithGitHub}
          disabled={signing}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#24292f',
            borderColor: '#24292f',
          }}
        >
          <GitHubIcon />
          {signing ? '이동 중…' : 'GitHub 으로 로그인'}
        </button>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
