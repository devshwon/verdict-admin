import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { errorMessage } from '../lib/errors';

// React StrictMode 가 useEffect 를 두 번 호출해도 code 교환은 한 번만 시도되도록
// 모듈 단위 플래그 사용 (페이지 로드 라이프사이클 동안 유효).
let processed = false;

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (processed) return;
    processed = true;

    async function complete() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error_description');

        if (errorParam) {
          setError(decodeURIComponent(errorParam));
          return;
        }

        // 1) PKCE: ?code=… 가 query 에 옴 → 직접 교환
        if (code) {
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState(null, '', url.pathname + url.search + url.hash);

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // 이미 처리되어 세션이 있을 수도 있으니 한 번 더 확인
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              navigate('/dashboard', { replace: true });
              return;
            }
            setError(`${error.message} (${error.name})`);
            return;
          }
          navigate('/dashboard', { replace: true });
          return;
        }

        // 2) Implicit fallback: hash 에 access_token=… 가 직접 옴
        const rawHash = window.location.hash;
        if (rawHash.includes('access_token=')) {
          const params = new URLSearchParams(rawHash.replace(/^#/, ''));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) {
              setError(error.message);
              return;
            }
            window.history.replaceState(null, '', window.location.pathname);
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // 3) 이미 세션이 있을 수도 있는 경우
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate('/dashboard', { replace: true });
          return;
        }

        setError('세션을 확립하지 못했습니다. 다시 로그인 해주세요.');
      } catch (e) {
        setError(errorMessage(e));
      }
    }

    complete();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      {error ? (
        <div className="error-banner" style={{ maxWidth: 460 }}>
          {error}
          <div style={{ marginTop: 8 }}>
            <Link to="/login">로그인 페이지로</Link>
          </div>
        </div>
      ) : (
        <span className="spinner" />
      )}
    </div>
  );
}
