---
name: 오늘 뭐먹지? (개발 단계 계획)
overview: |
  근거 문서: 루트 spec.md, api-spec.md, AGENTS.md.
  게이트: 0→1→2 순서만. 1단계 완료 전 2단계(Supabase 본연동) 금지. 각 섹션 끝에 사용자 진행 확인.
  Next.js는 frontend/. Supabase 프로젝트 표시 이름 vibe-tutorial. DB 작업은 Supabase MCP.
todos:
  - id: phase-0
    content: 0단계 — 프로젝트 초기 셋업
    status: completed
  - id: section-1a
    content: 1-A — 타입·목 데이터 골격
    status: completed
  - id: section-1b
    content: 1-B — 라우팅·내비게이션
    status: completed
  - id: section-1c
    content: 1-C — 오늘 점심 초기 로드 UI (api-spec 3.1)
    status: completed
  - id: section-1d
    content: 1-D — 세션 열기 (목업)
    status: completed
  - id: section-1e
    content: 1-E — 메뉴 제안 (F1)
    status: completed
  - id: section-1f
    content: 1-F — 투표·변경 (F2)
    status: completed
  - id: section-1g
    content: 1-G — 마감·결과 (F3·F4)
    status: completed
  - id: section-1h
    content: 1-H — 이력 (F5)
    status: completed
  - id: section-1i
    content: 1-I — 플로우 검증 (1단계 종료)
    status: completed
  - id: section-2a
    content: 2-A — Supabase 프로젝트·연결
    status: completed
  - id: section-2b
    content: 2-B — 스키마
    status: completed
  - id: section-2c
    content: 2-C — RLS·보안
    status: completed
  - id: section-2d
    content: 2-D — 공통 타입·에러
    status: completed
  - id: section-2e
    content: 2-E — 오늘 점심 조회 (3.1)
    status: completed
  - id: section-2f
    content: 2-F — 세션 생성 (3.2)
    status: completed
  - id: section-2g
    content: 2-G — 메뉴 제안 (3.3)
    status: completed
  - id: section-2h
    content: 2-H — 투표·변경 (3.4)
    status: completed
  - id: section-2i
    content: 2-I — 마감·집계 (3.5)
    status: completed
  - id: section-2j
    content: 2-J — 이력 (3.6)
    status: completed
  - id: section-2k
    content: 2-K — 인증·프로필
    status: completed
  - id: section-2l
    content: 2-L — 마무리·검증
    status: completed
isProject: false
---

# 오늘 뭐먹지? (개발 단계 계획)

근거 문서: 루트 `spec.md`, `api-spec.md`, `AGENTS.md`.

---

## 진행 규칙 (필수)

1. **단계 순서:** **0단계 → 1단계 → 2단계** 순으로만 진행한다.
2. **게이트:** **1단계가 완전히 끝나기 전에는 2단계로 넘어가지 않는다.** (목업·플로우 검증 완료 전 Supabase 연동·테이블 작업 금지)
3. **섹션 단위 중단:** 각 **섹션** 작업이 끝날 때마다 구현 담당(AI/개발자)은 **반드시 멈추고**, 사용자에게 **다음 섹션 진행 여부**를 묻는다.
4. **프로젝트 위치:** Next.js 앱은 저장소 루트의 `**frontend/`** 폴더 안에 둔다.

---

## 0단계: 프로젝트 초기 셋업

**스택:** Next.js **App Router** + **TypeScript** + **Tailwind CSS** + **Supabase 클라이언트(의존성만)**  
(이 단계에서는 **실제 Supabase 연결·마이그레이션은 하지 않아도 된다.** 2단계에서 본 연동.)

### 0.1 저장소·폴더

- `frontend/` 디렉터리 생성
- `frontend/` 안에 `create-next-app` 등으로 App Router·TS·Tailwind·ESLint 포함 프로젝트 생성
- 루트 `AGENTS.md`와 충돌 없는지 확인 (Pages Router 미사용, `app/` 사용)

### 0.2 의존성·환경 변수 자리

- `@supabase/supabase-js` 설치 (2단계 대비)
- (선택) `@supabase/ssr` — 프로젝트에서 권장 패턴이면 함께 설치
- `frontend/.env.local.example` 작성: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 키 이름만 명시 (**실제 값·커밋 금지**)
- `.gitignore`에 `.env.local` 포함 확인

### 0.3 Supabase 클라이언트 헬퍼 뼈대

- `frontend/lib/supabase/`(또는 프로젝트 관례 경로)에 **클라이언트 생성 유틸 파일** 추가 (환경 변수 읽기만, 1단계에서는 호출 안 해도 됨)

### 0.4 공통 UI·스타일

- Tailwind 기본 레이아웃(`app/layout.tsx`)에 앱 제목·기본 폰트/배경 정도만 정리
- (선택) `app/globals.css`에서 불필요한 기본 스타일만 조정

### 0.5 품질

- `frontend/`에서 `npm run build` 성공 확인

**0단계 완료 후:** 사용자에게 **1단계 진행 여부** 확인.

---

## 1단계: 목업 (Supabase 없음)

**전제:** **Supabase 연동 없음.** 데이터는 `**frontend/` 내 `mockData.ts`(또는 동일 역할 파일)의 하드코딩만** 사용.

**목표:** `spec.md`의 화면·흐름(F1~F5, §4, §7)을 만족하도록 **모든 화면을 클릭만으로** 끝까지 연결해 볼 수 있을 것.

**데이터 형태:** `api-spec.md` §2의 필드 이름·중첩 구조를 **최대한 동일**하게 맞춰 두면 2단계 교체가 쉽다.

---

### 섹션 1-A: 타입·목 데이터 골격

- `api-spec.md` §2를 참고해 `Team`, `LunchSession`, `MenuSuggestion`, `SessionResult`, `MyVote` 등 **TypeScript 타입** 정의 파일 추가
- `mockData.ts`에 `team`, `session`(또는 `null` 케이스용 별도 시나리오), `suggestions`, `myVote`, `result`를 넣을 수 있는 **기본 객체** 작성
- “세션 없음” 시나리오용 데이터 분기(예: `session: null`)를 mock에서 선택 가능하게 할지 결정하고 반영

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-B: 라우팅·내비게이션

- `spec.md` §7에 맞춰 최소 라우트: **오늘 점심(팀 홈)**, **이력** 페이지 경로 결정 (예: `/`, `/history`)
- 공통 헤더/링크로 두 화면 **서로 이동** 가능하게 구현
- 활성 링크 등 최소 UX

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-C: 오늘 점심 — 초기 로드 UI (`api-spec.md` §3.1 대응)

- `mockData`로 “오늘 한 번에 불러온 것 같은” 객체를 구성해 화면에 표시 (`team`, `session`, `suggestions`, `myVote`, `result`)
- `session === null`일 때: `spec.md` 흐름 1에 맞는 **안내 + “오늘 세션 열기”** 등 CTA 배치
- `session.status === "open"`일 때: 후보 목록·득표 수·마감 예정 표시
- `session.status === "closed"`일 때: `result` 영역 강조 (**오늘의 메뉴**, F4)

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-D: 세션 열기 (목업 상태 전환)

- 버튼 클릭 시 **클라이언트 상태**(또는 목업 스토어)로 `session`을 `open` 객체로 바꾸기
- 동일 팀·동일 날짜 중복 열림 방지를 목업에서도 한 규칙으로 시뮬레이션 (간단 토스트/alert도 가능)

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-E: 메뉴 제안 (F1)

- 입력 폼 + 추가 클릭 시 `suggestions` 배열에 항목 추가 (임시 `id` 생성)
- `spec.md` §5 **중복 제안** 규칙 1가지를 목업에서도 적용 (합치기 또는 별도 행 — 문서에 맞춰 통일)
- 제안 후 목록·득표 수 UI 갱신

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-F: 투표·변경 (F2, 1인 1표)

- 후보별 선택(라디오 등)으로 **내 투표** 하나만 선택되게 구현
- `spec.md` 권장대로 **투표 변경 허용** (다른 후보 클릭 시 `myVote` 갱신)
- `voteCount`를 목업에서 재계산하거나, 단순히 선택에 맞게 숫자 조정

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-G: 마감·결과 표시 (F3·F4)

- “마감” 클릭 시 `session.status`를 `closed`로, `result` 객체 생성(최다 득표, 동점 시 `spec.md` 정책 1가지)
- 후보 0개·표 0개 시나리오를 목업 데이터/버튼으로 재현 가능하게 (§5 정책에 맞는 표시)
- 마감 후 투표/제안 비활성 또는 `api-spec.md` 에러 메시지 톤의 안내

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-H: 이력 화면 (F5, `api-spec.md` §3.6)

- `mockData`에 과거 확정 건 `items[]` 배열 준비 (`date`, `winningLabels`, `isTie`, `closedAt` 등)
- 이력 페이지에서 날짜순 목록 표시
- 오늘 마감한 결과가 목업 흐름상 이력에 **반영되도록** 상태 연결(같은 세션 스토어에서 push 등)

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 1-I: 플로우 검증 (1단계 종료 조건)

- **클릭만으로** 다음 순서를 끝까지 재현: 세션 열기 → 제안 2개 이상 → 투표·변경 → 마감 → 오늘의 메뉴 확인 → 이력에서 확인
- `session: null` 진입 → 세션 생성 경로 확인
- `spec.md` §9 MVP 체크리스트를 **목업 기준**으로 가능한 항목은 모두 체크

**1단계 전체 완료 후에만** 사용자에게 **2단계 진행 여부** 확인.  
**(2단계는 여기서 “예”를 받기 전까지 시작하지 않는다.)**

---

## 2단계: 실제 구현 (Supabase + API)

**시작 조건:** **1단계 섹션 1-I까지 완료** + 사용자가 **플로우 검증 완료**를 확인했을 것.

**목표:** `mockData.ts` 의존을 제거하고, `**api-spec.md`의 자료 구조**로 테이블·API(또는 Supabase 직접 호출)를 맞춘다.

**Supabase:** 프로젝트 표시 이름 `**vibe-tutorial`** 을 사용한다. (대시보드에서 프로젝트를 식별할 때 이 이름을 기준으로 한다.)

**도구:** DB 마이그레이션·SQL 적용 등 Supabase 작업은 **Supabase MCP**를 사용한다.

---

### 섹션 2-A: Supabase 프로젝트·연결

- Supabase에서 `**vibe-tutorial`** 프로젝트 준비(없으면 생성)
- `frontend/.env.local`에 URL·anon 키 설정 (**커밋 금지**)
- MCP로 프로젝트 접근 가능 여부 확인

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-B: 스키마 (`spec.md` §6 + `api-spec.md` 필드)

- MCP로 테이블 생성/마이그레이션: `teams`, `profiles`, `team_members`, `lunch_sessions`, `menu_suggestions`, `votes`, `session_results`
- `votes`: `(session_id, user_id)` 유니크로 **1인 1표** 보장
- `api-spec.md`에 나온 필드와 이름·타입을 최대한 맞춤 (필요 시 snake_case ↔ camelCase 매핑은 앱 레이어에서)

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-C: RLS·보안 (`spec.md` §6, `AGENTS.md`)

- 테이블별 RLS 활성화
- 팀 소속 기준 읽기/쓰기 정책
- 마감·집계는 **서버 역할** 또는 RPC 등으로만 수행되게 설계 (클라이언트 임의 마감 방지)
- 서비스 롤 키는 서버 전용

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-D: 공통 타입·에러 (`api-spec.md` §1)

- 응답/에러 형식 `{ error: { code, message } }` 타입 또는 헬퍼
- `code` 목록: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `VOTE_CLOSED`, `ALREADY_CLOSED` 등

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-E: 오늘 점심 조회 (`api-spec.md` §3.1)

- `GET`(또는 동등한 Server Action)으로 `team`, `session`, `suggestions`, `myVote`, `result` 한 번에 반환
- 기존 목업 화면이 이 데이터로 동작하도록 연결

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-F: 세션 생성 (`api-spec.md` §3.2)

- 팀·날짜 기준 중복 세션 방지
- 응답 본문이 `api-spec.md` 예시와 동일 구조인지 확인

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-G: 메뉴 제안 (`api-spec.md` §3.3)

- `label` 트림·길이 검증
- `spec.md` §5 중복 제안 정책을 서버/DB에 반영

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-H: 투표·변경 (`api-spec.md` §3.4)

- upsert로 1인 1표
- 마감 후 `VOTE_CLOSED` 처리
- (선택) 투표 취소 API

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-I: 마감·집계 (`api-spec.md` §3.5)

- 서버에서 집계 후 `session_results` 저장, 세션 `closed`
- 동점·후보 0건 처리 (`spec.md` §5와 동일 정책)

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-J: 이력 (`api-spec.md` §3.6)

- 팀별 `items[]` 목록 API
- 이력 페이지를 실데이터로 전환

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-K: 인증·프로필 (최소)

- `spec.md` §2에 맞게 로그인 후에만 투표/제안 가능하도록 제한 (MVP: 매직링크 또는 이메일 등 한 방식)
- `profiles` / `team_members`와 연동

**완료 후 멈추고 → 사용자에게 다음 섹션 진행 여부 확인.**

---

### 섹션 2-L: 마무리·검증

- `mockData.ts` 제거 또는 미사용 처리
- `spec.md` §9 체크리스트 전항목 실서버 기준 재확인
- `npm run build` 성공

**2단계 완료 후:** 사용자에게 배포·테스트 범위 등 다음 작업 여부 확인.

---

## 문서 매핑 (참고)


| 단계  | 주로 읽을 문서                                            |
| --- | --------------------------------------------------- |
| 0   | `AGENTS.md`                                         |
| 1   | `spec.md`(§3~§7, §9), `api-spec.md`(§2·§3.1 형태)     |
| 2   | `api-spec.md`(전체), `spec.md`(§5·§6·§9), `AGENTS.md` |


---

## 다시 한 번 강조

- **1단계가 완전히 끝나기 전에는 2단계로 넘어가지 않는다.**
- **각 섹션 완료 후 반드시 멈추고, 다음 진행 여부를 사용자에게 묻는다.**

