# AGENTS.md — 프로젝트 규칙 (AI·협업용)

이 문서는 이 저장소에서 코드를 작성하거나 수정할 때 **반드시** 따를 규칙입니다. 사용자가 매번 같은 설명을 반복하지 않아도 되도록 스택과 제약을 한곳에 모았습니다.

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | **Next.js** — **App Router** (`app/` 디렉터리)만 사용 |
| 언어 | **TypeScript** (`.ts`, `.tsx`) |
| 스타일 | **Tailwind CSS** |
| 데이터베이스·백엔드 | **Supabase** (클라이언트·서버 클라이언트·RLS 등 프로젝트에 맞게 사용) |

---

## 반드시 지킬 것 (DO)

- **App Router**로 라우팅·레이아웃·로딩·에러 UI를 구성한다. `pages/` 기반 Pages Router는 새 코드에 사용하지 않는다.
- 모든 새 컴포넌트·유틸·API 관련 코드는 **TypeScript**로 작성하고, `any` 남용 대신 적절한 타입·`interface`·제네릭을 사용한다.
- UI 스타일은 **Tailwind 유틸리티 클래스**를 우선한다. 인라인 `style`은 Tailwind로 표현하기 어려운 경우 등 예외에만 쓴다.
- 데이터 접근은 **Supabase** 클라이언트(또는 프로젝트에 정의된 Supabase 헬퍼)를 통해 한다. 환경 변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등)는 코드에 하드코딩하지 않는다.
- 서버에서만 실행되어야 하는 로직(비밀 키, 관리자 권한)은 **Server Components**, **Route Handlers**(`app/api/.../route.ts`), 또는 **Server Actions** 등 서버 경계 안에 둔다.
- **보안**: 서비스 롤 키·비밀은 클라이언트 번들에 넣지 않는다. RLS(Row Level Security)를 전제로 클라이언트 쿼리를 설계한다.
- 기존 파일의 **import 스타일, 폴더 구조, 네이밍**을 우선 맞춘다. 불필요한 대규모 리팩터 없이 요청 범위 안에서만 수정한다.

---

## 하면 안 되는 것 (DON'T)

- **Pages Router**만을 전제로 한 예제 코드(`pages/index.tsx` 등)를 새로 추가하거나, App Router와 혼용해 같은 기능을 이중으로 만든다.
- **JavaScript만** 쓰는 새 파일(`.js`, `.jsx`)을 기본으로 추가한다. (기존 레거시가 있다면 점진적 마이그레이션은 별도 합의.)
- **CSS Modules, styled-components, Emotion** 등 이 프로젝트 스택과 다른 스타일 방식을 새 기능에 도입한다. (Tailwind + 필요 시 프로젝트에 이미 있는 패턴만 사용.)
- **Prisma, MongoDB 직접 연결, Firebase** 등 이 문서에 없는 DB/백엔드를 새로 끌어온다. 데이터 계층은 **Supabase**로 통일한다.
- **민감한 키·토큰**을 소스에 박거나 `.env` 실제 값을 커밋·채팅에 붙여 넣게 제안한다.
- 사용자가 요청하지 않은 **대규모 리팩터, 불필요한 의존성 추가, 문서 파일 남발**을 한다.

---

## 참고

- Next.js 버전·Supabase 클라이언트 패턴은 프로젝트의 `package.json` 및 기존 `lib/`·`app/` 코드를 기준으로 한다.
- 이 문서와 충돌하는 지시가 있으면 **사용자의 최신 지시**를 우선하고, 가능하면 이 파일도 함께 갱신할 것을 제안한다.
