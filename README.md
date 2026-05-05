# Verdict Admin

Verdict 본체와 같은 Supabase 프로젝트를 공유하는 별도 React SPA 관리자 페이지.
GitHub Pages 정적 호스팅으로 배포한다.

본 README는 운영자/개발자 인수인계용 요약본이다. 자세한 설계는 `docs/admin-handoff.md`.

---

## 1. 사전 조건

- 본체 레포에서 마이그레이션이 적용되어 있어야 함
  - `20260506000001_admin_phase1.sql` (`admin_moderation_actions` + 투표/신고 RPC)
  - `20260507000001_inquiries.sql` (`inquiries` 테이블 + 문의 RPC)
  - `20260508000001_admin_unblock_user.sql` (`admin_find_user`, `admin_unblock_user`)
- Supabase Authentication 에서 **GitHub provider** 활성화 (§5 참고)
- 운영자가 한 번 로그인해 `auth.users` 에 행이 생긴 뒤, `users.is_admin = true` 설정
  ```sql
  update public.users set is_admin = true where id = '<운영자 user uuid>';
  ```

## 2. 로컬 실행

```bash
npm install
cp .env.example .env.local
# .env.local 에 anon key 채워 넣기
npm run dev
```

브라우저: <http://localhost:5173>

## 3. 환경변수

| 변수 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | `https://oclmcgsjucfyyhjtaktt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon public` |

`service_role` 키는 절대 client 에 노출 금지.

## 4. 디렉터리

```
src/
├── App.tsx                    HashRouter + AuthGuard
├── main.tsx
├── auth/                      LoginPage / AuthCallback / AuthGuard (magic link)
├── components/                Sidebar / Layout / ConfirmDialog / Toast
├── config/supabase.ts
├── lib/                       RPC 래퍼 (votes, reports, candidates, date, types)
├── pages/                     Dashboard / Candidates / Votes / Reports
└── styles/global.css
```

## 5. GitHub OAuth 설정 (인증)

이 admin 페이지는 GitHub OAuth 만 사용한다 (이메일/매직링크 없음).
누구든 본인 GitHub 계정으로 로그인 후, 운영자가 `is_admin=true` 부여하면 접근 가능.

### 5-1. GitHub OAuth App 만들기
1. <https://github.com/settings/developers> → **New OAuth App**
2. 입력
   - Application name: `Verdict Admin`
   - Homepage URL: `https://<owner>.github.io/<repo>/` (또는 임시로 `http://localhost:5173/verdict_admin/`)
   - **Authorization callback URL** ⚠️ 정확히:
     ```
     https://oclmcgsjucfyyhjtaktt.supabase.co/auth/v1/callback
     ```
3. 생성 후 **Client ID** + **Client Secret (Generate a new client secret)** 확보

### 5-2. Supabase 에 GitHub Provider 등록
1. Supabase Dashboard → Authentication → **Providers** → **GitHub** → Enable
2. 위에서 받은 Client ID / Client Secret 붙여넣기 → Save

### 5-3. Redirect URL allowlist 등록
Supabase Dashboard → Authentication → **URL Configuration** → *Redirect URLs* 에 모두 추가:
```
http://localhost:5173/verdict_admin/**
https://<owner>.github.io/<repo>/**
```
누락 시 OAuth 콜백이 거부되어 세션이 안 잡힘.

### 5-4. 운영자 권한 부여
1. 해당 운영자가 admin 페이지에서 GitHub 으로 한 번 로그인 시도
   (이 시점에는 `is_admin=false` 라 즉시 로그아웃되며 "권한 없음" 안내가 뜸)
2. Supabase SQL Editor 에서 user uuid 확인 후 권한 부여:
   ```sql
   -- email 로 찾기
   select id, email from auth.users order by created_at desc limit 5;

   -- 권한 부여
   update public.users set is_admin = true
   where id = '<해당 user uuid>';
   ```
3. 운영자가 다시 로그인 → 정상 진입

권한 회수도 동일하게 한 줄: `update public.users set is_admin = false where id = '...';`

### 5-5. 감사
누가 무슨 액션을 했는지는 `admin_moderation_actions.actor_id` 에 본인 user uuid 로 남는다 (공유 계정이 아니라 각자 GitHub 계정 사용 권장 이유).

---

## 6. GitHub Pages 배포

1. 이 디렉터리를 GitHub repo 로 푸시 (예: `your-org/verdict_admin`)
2. Repo Settings → Pages → Source: `GitHub Actions`
3. Repo Settings → Secrets and variables → Actions:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. `main` 브랜치 push 시 `.github/workflows/deploy.yml` 가 자동 실행
   - `BASE_URL` 은 repo 이름으로 자동 주입 (`/<repo>/`)
   - `dist/404.html` 이 SPA fallback 으로 복사됨 (HashRouter 와 함께 이중 안전망)

배포 후 URL: `https://<owner>.github.io/<repo>/`

> 배포 URL 확정 후 §5-1 의 Homepage URL, §5-3 의 Redirect URL allowlist 에 해당 URL 추가하는 걸 잊지 말 것.

## 7. 페이지 구성

| 라우트 | 역할 |
|---|---|
| `/login` | GitHub OAuth 로그인 |
| `/auth/callback` | OAuth 콜백, 세션 확립 후 `/dashboard` 이동 |
| `/dashboard` | 신고 미처리 카운트 + 어제 발행된 today 요약 |
| `/candidates` | 어제 등록 후보 카테고리별 그룹, 카테고리당 1건 라디오 → `promote_today_candidates` |
| `/votes` | 일반투표 검색·필터·반려 (`admin_list_votes`, `admin_soft_delete_vote`) |
| `/reports` | 신고 큐 아코디언, 반려/유지 (`admin_list_reported_votes`, `admin_get_vote_reports`, `admin_restore_vote`) |
| `/inquiries` | 사용자 문의 큐 (`admin_list_inquiries`, `admin_resolve_inquiry`, `admin_delete_inquiry`) |
| `/users` | 등록 차단 사용자 조회·해제 (`admin_find_user`, `admin_unblock_user`) |

## 8. 보안 메모

- 모든 admin 작업은 `is_admin` 가드 RPC (security definer) 경유
- anon key 는 client 에 정상 노출되지만 비관리자가 admin RPC 호출 시 `P0008`
- 신고자/문의자 식별자는 `reporter_short` / `user_short` (uuid 앞 4자리) 만 노출

## 9. 다음 단계 (Phase 2)

`docs/admin-handoff.md` §8~10 참고 — 자동 랭킹, 프롬프트 편집은 본체 레포 마이그레이션 + Edge Function 작업이 선행된 후 추가한다.
