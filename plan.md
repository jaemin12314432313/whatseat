# plan.md — 오늘 뭐먹지? 개발 순서

[spec.md](spec.md)의 기능·정책·데이터 모델, [api-spec.md](api-spec.md)의 JSON·API 절 번호, [AGENTS.md](AGENTS.md)의 스택·보안을 기준으로 **실제로 짜는 순서**를 단계별 체크리스트로 정리한다.

**한 줄 순서:** 스택·환경 → DB(§6) → RLS → Auth·팀 → API 모양(§1~2, 3.x) → 3.1 조회 → 3.2 세션 → 3.3 제안 → 3.4 투표 → 3.5 마감 → F4 UI → 3.6 이력 → 마무리

---

## 빠른 참고: 스펙 ↔ API

| spec | api-spec | 화면/동작 (api-spec §4) |
|------|----------|-------------------------|
| F1 메뉴 제안 | **3.3** `POST .../suggestions` | 제안 추가 후 3.1 재조회 또는 응답 반영 |
| F2 투표·변경 | **3.4** `PUT .../my-vote` (또는 POST), 선택 `DELETE` | 마감 전만 |
| F3 마감·집계 | **3.5** `POST .../close` | 서버에서만 |
| F4 결과 공유 | **3.1** 응답의 `result` | 첫 로드도 3.1 |
| F5 이력 | **3.6** `GET .../history?limit=` | 이력 페이지·탭 |

정책은 **spec §5**에서 각각 **한 가지**로 정한 뒤 구현에 박는다. (중복 제안, 동점, 후보 0개·0표, 타임존)

---

## 0단계: 프로젝트·환경

- [ ] Next.js 생성, **App Router만** (`app/`)
- [ ] TypeScript·Tailwind 적용
- [ ] Supabase 프로젝트 준비, `.env.local`에 URL·anon 키 (값은 커밋하지 않음)
- [ ] `@supabase/supabase-js` 및(필요 시) `@supabase/ssr` — `lib/supabase/` 등에 브라우저·서버 클라이언트 헬퍼 정리

---

## 1단계: DB 테이블 (spec §6)

- [ ] `teams`
- [ ] `profiles` — Auth `user.id`와 연결, 표시명 등
- [ ] `team_members` — user ↔ team
- [ ] `lunch_sessions` — 팀·날짜(또는 “오늘” 기준), `status` open/closed, `closes_at` 등
- [ ] `menu_suggestions` — 세션·라벨·제안자
- [ ] `votes` — **`(session_id, user_id)` 유니크**로 1인 1표 (spec §5)
- [ ] `session_results` — 마감 스냅샷 (이력·오늘 확정 표시, api-spec §2.4)
- [ ] 마이그레이션/SQL을 저장소에 둘지 팀 규칙대로 정리

---

## 2단계: RLS·보안 (spec §6 보안, AGENTS.md)

- [ ] 위 테이블에 RLS **켜기**
- [ ] **소속 팀** 데이터만 읽기/쓰기 되도록 정책
- [ ] **마감·집계**는 클라이언트만으로 끝나지 않게 (서비스 롤·RPC·Route Handler 등 **한 방식**으로 통일)
- [ ] 서비스 롤 키는 **서버 전용** (번들에 넣지 않음)

---

## 3단계: Auth·팀 MVP (spec §2, §8 범위)

- [ ] Supabase Auth 최소 연동 (이메일·매직링크 등)
- [ ] 로그인 시 `profiles` / `team_members` 채우기 (트리거 또는 앱에서 1회)
- [ ] MVP 단순화: **단일 팀 고정** 또는 **초대/참가 한 가지**로 팀 진입 정리

---

## 4단계: JSON·타입·에러 통일 (api-spec §1, §2)

- [ ] **A안/B안** 선택  
  - A안: Supabase 직접 호출하되, 화면이 쓰는 객체를 api-spec과 **같은 필드명**으로 조립  
  - B안: `app/api/.../route.ts` 또는 Server Action이 api-spec과 **같은 요청/응답 JSON**
- [ ] 타입 정의: `team`, `session`, `suggestions[]`, `myVote`, `result`, 이력 `items[]` (api-spec §2)
- [ ] 실패 시 **`{ "error": { "code", "message" } }`** (api-spec §1.2)  
  - 코드 예: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `VOTE_CLOSED`, `ALREADY_CLOSED`
- [ ] 성공 시 상태 코드: 일반 200, 생성 201 (api-spec §1.3)

---

## 5단계: 오늘 점심 한 번에 조회 — api-spec **3.1**

- [ ] `GET /api/teams/{teamId}/lunch/today` 등 **프로젝트에서 경로 하나로 고정**
- [ ] 응답: `team`, `session`, `suggestions`(각 `voteCount` 포함), `myVote`, `result`
- [ ] **`session === null`** 이면 빈 제안·null vote/result 처리 (api-spec 예시대로)
- [ ] UI: 세션 없을 때 “오늘 세션 열기” 등 분기 (spec §4 흐름 1)

---

## 6단계: 세션 생성 — api-spec **3.2** (spec §4 흐름 1)

- [ ] `POST /api/teams/{teamId}/lunch/sessions` (또는 동등 경로)
- [ ] 바디: `date`, `closesAt` 선택 — 생략 시 서버 기본값(오늘 등)
- [ ] 응답 **201** + `{ "session": { ... } }`
- [ ] **동일 팀·동일 날짜** 세션 중복 방지

---

## 7단계: 메뉴 제안 — api-spec **3.3** (spec **F1**, §5 중복)

- [ ] `POST /api/lunch/sessions/{sessionId}/suggestions`, 바디 `{ "label" }`
- [ ] 서버: `label` trim, 길이 제한(예: 1~80자)
- [ ] 응답 **201** + `suggestion` (`voteCount` 0 등)
- [ ] **중복 제안 규칙 1가지**를 코드·주석으로 고정 (spec §5)

---

## 8단계: 투표·변경 — api-spec **3.4** (spec **F2**, §5 1인 1표)

- [ ] `PUT` 또는 `POST` `.../my-vote`, 바디 `{ "suggestionId" }` — upsert로 변경 허용
- [ ] 마감 후 → **`VOTE_CLOSED`** 등 (api-spec §1.2)
- [ ] (선택) `DELETE .../my-vote` → `{ "myVote": null }`
- [ ] 응답에 `suggestions` 갱신치를 줄지, 프론트가 **3.1 재호출**할지 정하기

---

## 9단계: 마감·집계 — api-spec **3.5** (spec **F3**, §5 동점·0후보)

- [ ] `POST .../close` — **서버에서만** 집계 + `session_results` 저장 + `session.status = closed`
- [ ] 응답: `session`, `result` (`winningSuggestionIds`, `winningLabels`, `closedAt`, `isTie`)
- [ ] **동점**: `isTie: true`, 승자 여러 개 (spec §3·§5에서 정한 규칙 1가지)
- [ ] **후보 0개 등**: api-spec 예시처럼 빈 배열 + 선택 필드 `note` (`NO_CANDIDATES` 등)로 통일

---

## 10단계: 확정 메뉴 UI — spec **F4**

- [ ] **3.1**의 `result`를 상단(또는 강조 영역)에 표시
- [ ] 팀원 모두 같은 데이터 소스(같은 API/같은 RLS)로 **동일 결과** 보는지 확인 (spec §9)

---

## 11단계: 이력 — api-spec **3.6** (spec **F5**, §7)

- [ ] `GET /api/teams/{teamId}/lunch/history?limit=30` (한도는 프로젝트에서 통일)
- [ ] 응답 `items[]`: `sessionId`, `date`, `winningLabels`, `isTie`, `closedAt`
- [ ] 이력 전용 라우트 또는 탭 (spec §7)

---

## 12단계: 마무리 (spec §9 체크리스트)

- [ ] 로딩·에러 UI (네트워크, `UNAUTHORIZED`, `VALIDATION_ERROR` 등)
- [ ] spec §9 MVP 체크리스트 항목 **전부** 다시 확인
- [ ] (선택) 수동 시나리오: 세션 생성 → 제안 2개 → 투표·변경 → 마감 → 이력 표시

---

## AI·협업용 한 줄

**“[plan.md](plan.md) 단계 순서대로 구현하고, 각 단계 끝에 해당 체크박스를 만족하는지 검증해줘.”**
