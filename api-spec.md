# api-spec.md — 오늘 뭐먹지? (프론트 ↔ 백엔드 데이터)

`spec.md`의 MVP 기능(F1~F5)을 기준으로, **화면이 서버(Supabase·Route Handler·Server Action 등)와 주고받는 데이터**를 정리한다.

구현 방식은 `AGENTS.md`에 맞게 선택한다.

- **A안:** Supabase 클라이언트가 테이블을 직접 조회·삽입·수정하고, 아래 JSON은 **“그 결과로 프론트가 갖게 되는/보내는 데이터 모양”**으로 본다.
- **B안:** Next.js `app/api/.../route.ts` 또는 Server Action이 아래와 **같은 형태의 객체**를 반환·수신한다.

이 문서는 **경로는 예시**이며, 실제 URL은 프로젝트에서 통일하면 된다.

---

## 1. 공통 규칙

### 1.1 식별자·시간

- `id` 류 필드는 문자열(UUID)로 둔다고 가정한다.
- 날짜는 ISO 8601 문자열 예: `"2025-03-27"` 또는 `"2025-03-27T12:00:00.000Z"`.

### 1.2 에러 응답 (예시)

실패 시 프론트가 처리하기 쉽게 **한 형태**로 맞춘다.

```json
{
  "error": {
    "code": "VOTE_CLOSED",
    "message": "이미 마감된 세션에는 투표할 수 없습니다."
  }
}
```

`code` 예: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `VOTE_CLOSED`, `ALREADY_CLOSED`.

### 1.3 성공 응답

특별히 명시하지 않으면 HTTP **200** + 아래 본문 JSON. 생성은 **201** + 생성된 리소스를 줄 수 있다.

---

## 2. 자주 쓰는 데이터 조각 (타입 느낌)

프론트·백엔드가 같은 필드 이름을 쓰면 통신이 단순해진다.

### 2.1 팀 요약

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "디자인1팀"
}
```

### 2.2 점심 세션

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "teamId": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2025-03-27",
  "status": "open",
  "closesAt": "2025-03-27T11:30:00.000Z"
}
```

- `status`: `"open"` | `"closed"`

### 2.3 메뉴 후보(제안)

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "label": "쌀국수",
  "suggestedByUserId": "880e8400-e29b-41d4-a716-446655440003",
  "suggestedByDisplayName": "민지",
  "voteCount": 4,
  "createdAt": "2025-03-27T09:12:00.000Z"
}
```

- `voteCount`: 목록을 그릴 때 서버에서 집계해 주거나, 프론트가 별도 집계 API로 받는다.

### 2.4 오늘의 확정 결과 (마감 후)

```json
{
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "winningSuggestionIds": ["770e8400-e29b-41d4-a716-446655440002"],
  "winningLabels": ["쌀국수"],
  "closedAt": "2025-03-27T11:30:05.000Z",
  "isTie": false
}
```

- 동점이면 `winningSuggestionIds`·`winningLabels`에 여러 개, `isTie: true` (정책은 `spec.md`와 동일).

### 2.5 내 투표 (1인 1표)

```json
{
  "suggestionId": "770e8400-e29b-41d4-a716-446655440002"
}
```

투표 전이면 `null` 또는 필드 생략.

---

## 3. API별 요청·응답 예시

### 3.1 오늘 점심 화면 한 번에 불러오기 (추천)

**목적:** 제안 목록, 득표 수, 내 투표, 마감 여부, 확정 메뉴를 한 번에 표시 (F1~F4).

**요청 (예시)**

`GET /api/teams/{teamId}/lunch/today`

또는 쿼리: `GET /api/lunch/sessions/today?teamId=...`

**응답 예시 — 마감 전**

```json
{
  "team": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "디자인1팀"
  },
  "session": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "teamId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2025-03-27",
    "status": "open",
    "closesAt": "2025-03-27T11:30:00.000Z"
  },
  "suggestions": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "sessionId": "660e8400-e29b-41d4-a716-446655440001",
      "label": "쌀국수",
      "suggestedByUserId": "880e8400-e29b-41d4-a716-446655440003",
      "suggestedByDisplayName": "민지",
      "voteCount": 4,
      "createdAt": "2025-03-27T09:12:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "sessionId": "660e8400-e29b-41d4-a716-446655440001",
      "label": "돈까스",
      "suggestedByUserId": "880e8400-e29b-41d4-a716-446655440005",
      "suggestedByDisplayName": "준호",
      "voteCount": 2,
      "createdAt": "2025-03-27T09:15:00.000Z"
    }
  ],
  "myVote": {
    "suggestionId": "770e8400-e29b-41d4-a716-446655440002"
  },
  "result": null
}
```

**응답 예시 — 마감 후 (확정 메뉴 공유, F4)**

```json
{
  "team": { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "디자인1팀" },
  "session": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "teamId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2025-03-27",
    "status": "closed",
    "closesAt": "2025-03-27T11:30:00.000Z"
  },
  "suggestions": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "sessionId": "660e8400-e29b-41d4-a716-446655440001",
      "label": "쌀국수",
      "suggestedByUserId": "880e8400-e29b-41d4-a716-446655440003",
      "suggestedByDisplayName": "민지",
      "voteCount": 4,
      "createdAt": "2025-03-27T09:12:00.000Z"
    }
  ],
  "myVote": { "suggestionId": "770e8400-e29b-41d4-a716-446655440002" },
  "result": {
    "sessionId": "660e8400-e29b-41d4-a716-446655440001",
    "winningSuggestionIds": ["770e8400-e29b-41d4-a716-446655440002"],
    "winningLabels": ["쌀국수"],
    "closedAt": "2025-03-27T11:30:05.000Z",
    "isTie": false
  }
}
```

**오늘 세션이 아직 없을 때 (예시)**

```json
{
  "team": { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "디자인1팀" },
  "session": null,
  "suggestions": [],
  "myVote": null,
  "result": null
}
```

프론트는 `session === null`이면 “오늘 세션 열기” 버튼 등을 보여주면 된다.

---

### 3.2 오늘 세션 만들기 (선택)

**목적:** `spec.md` 흐름 1 — “오늘의 점심 세션” 생성.

**요청**

`POST /api/teams/{teamId}/lunch/sessions`

```json
{
  "date": "2025-03-27",
  "closesAt": "2025-03-27T11:30:00.000Z"
}
```

- `date`/`closesAt`는 서버에서 “오늘” 기본값을 넣고 생략해도 된다.

**응답 201 예시**

```json
{
  "session": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "teamId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2025-03-27",
    "status": "open",
    "closesAt": "2025-03-27T11:30:00.000Z"
  }
}
```

---

### 3.3 메뉴 제안 (F1)

**요청**

`POST /api/lunch/sessions/{sessionId}/suggestions`

```json
{
  "label": " 마라탕 "
}
```

**응답 201 예시**

```json
{
  "suggestion": {
    "id": "990e8400-e29b-41d4-a716-446655440006",
    "sessionId": "660e8400-e29b-41d4-a716-446655440001",
    "label": "마라탕",
    "suggestedByUserId": "880e8400-e29b-41d4-a716-446655440003",
    "suggestedByDisplayName": "민지",
    "voteCount": 0,
    "createdAt": "2025-03-27T09:20:00.000Z"
  }
}
```

- 서버에서 `label` 앞뒤 공백 제거·길이 제한(예: 1~80자)을 권장.

---

### 3.4 투표하기 / 변경하기 (F2, 1인 1표)

**요청**

`PUT /api/lunch/sessions/{sessionId}/my-vote`

또는 `POST` 로 동일 바디.

```json
{
  "suggestionId": "770e8400-e29b-41d4-a716-446655440002"
}
```

**응답 200 예시**

```json
{
  "myVote": {
    "suggestionId": "770e8400-e29b-41d4-a716-446655440002"
  },
  "suggestions": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "label": "쌀국수",
      "voteCount": 5
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "label": "돈까스",
      "voteCount": 2
    }
  ]
}
```

- 마감 후 호출 시 `VOTE_CLOSED` 등 에러.
- 응답에 `suggestions` 전체를 안 줄 경우, 프론트는 **3.1을 다시 호출**해 목록을 갱신해도 된다.

**투표 취소 (선택)**

```json
DELETE /api/lunch/sessions/{sessionId}/my-vote
```

응답 예시: `{ "myVote": null }`

---

### 3.5 마감 + 자동 집계 (F3)

**목적:** 서버가 득표를 집계해 `session_results`에 저장하고 세션을 `closed`로 바꾼다. **반드시 서버(또는 DB 트리거)에서 수행**하는 것을 권장한다.

**요청**

`POST /api/lunch/sessions/{sessionId}/close`

바디 없음 또는 빈 객체 `{}`.

**응답 200 예시**

```json
{
  "session": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "closed"
  },
  "result": {
    "sessionId": "660e8400-e29b-41d4-a716-446655440001",
    "winningSuggestionIds": ["770e8400-e29b-41d4-a716-446655440002"],
    "winningLabels": ["쌀국수"],
    "closedAt": "2025-03-27T11:30:05.000Z",
    "isTie": false
  }
}
```

**후보가 없을 때 (예시)**

```json
{
  "session": { "id": "660e8400-e29b-41d4-a716-446655440001", "status": "closed" },
  "result": {
    "sessionId": "660e8400-e29b-41d4-a716-446655440001",
    "winningSuggestionIds": [],
    "winningLabels": [],
    "closedAt": "2025-03-27T11:30:05.000Z",
    "isTie": false,
    "note": "NO_CANDIDATES"
  }
}
```

`note`는 선택 필드. `spec.md` 정책에 맞춰 `"UNDECIDED"` 등으로 통일해도 된다.

---

### 3.6 최근 확정 이력 (F5)

**요청**

`GET /api/teams/{teamId}/lunch/history?limit=30`

**응답 예시**

```json
{
  "items": [
    {
      "sessionId": "660e8400-e29b-41d4-a716-446655440001",
      "date": "2025-03-27",
      "winningLabels": ["쌀국수"],
      "isTie": false,
      "closedAt": "2025-03-27T11:30:05.000Z"
    },
    {
      "sessionId": "aa0e8400-e29b-41d4-a716-446655440010",
      "date": "2025-03-26",
      "winningLabels": ["볶음밥", "짜장면"],
      "isTie": true,
      "closedAt": "2025-03-26T11:28:00.000Z"
    }
  ]
}
```

---

## 4. 화면 ↔ API 매핑 (빠른 참고)

| 화면/동작 | 사용할 API(예시) |
|-----------|------------------|
| 팀 홈·오늘 점심 첫 로드 | `3.1` |
| “오늘 세션 열기” | `3.2` |
| 제안 추가 | `3.3` → 이후 `3.1` 재조회 또는 응답만으로 반영 |
| 투표·변경 | `3.4` |
| 마감 버튼 | `3.5` → 이후 `3.1` 재조회 |
| 이력 페이지 | `3.6` |

---

## 5. Supabase만 쓸 때 (참고)

테이블을 직접 읽고 쓰면 **HTTP 경로 대신** 아래에 대응한다.

| 이 문서의 동작 | 테이블·작업 예 |
|----------------|----------------|
| 오늘 화면 | `lunch_sessions` + `menu_suggestions` + `votes` + `session_results` 조인·조회 |
| 제안 | `menu_suggestions` insert |
| 투표 | `votes` upsert (세션+유저 유니크) |
| 마감 | Edge Function / Route Handler에서만 `close` + 집계 + `session_results` insert 권장 |
| 이력 | `session_results` (또는 `closed` 세션) 목록 조회 |

RLS로 팀 소속만 접근 가능하게 맞춘다. (`spec.md` 6절)

---

이 파일은 `spec.md`와 함께 두고, AI에게 **“`api-spec.md`의 JSON 형태를 타입과 API 구현에 반영해줘”**라고 지시하면 된다.
