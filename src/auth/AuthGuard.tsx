import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabase';

type GuardState = 'loading' | 'allowed' | 'unauthenticated' | 'forbidden';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>('loading');
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setState('unauthenticated');
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !profile?.is_admin) {
        await supabase.auth.signOut();
        setState('forbidden');
        return;
      }

      setState('allowed');
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <span className="spinner" />
      </div>
    );
  }
  if (state === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (state === 'forbidden') {
    return <Navigate to="/login?error=not_admin" replace />;
  }
  return <>{children}</>;
}
