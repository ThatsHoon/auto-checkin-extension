# 멀티게임 자동 출석체크 확장 프로그램 설계

## 개요

원신, 붕괴: 스타레일, 젠레스 존 제로, 명일방주: 엔드필드, 승리의여신: 니케 5개 게임의 웹 출석체크 이벤트를 자동으로 수행하는 Chrome 확장 프로그램(Manifest V3). 브라우저가 켜져있는 동안 `chrome.alarms`로 주기적으로 백그라운드에서 각 게임의 출석체크 API를 직접 호출한다. 비밀번호나 로그인 자동화는 하지 않는다 — 사용자가 각 사이트에 이미 로그인되어 있는 브라우저 세션(쿠키/localStorage 토큰)을 재사용할 뿐이다.

## 목표

- 5개 게임 각각의 출석체크를 사람 개입 없이 매일 자동 수행
- 계정 비밀번호는 저장·전송하지 않음 (기존 로그인 세션의 쿠키/토큰만 재사용)
- 출석 성공/실패를 팝업 UI에서 확인 가능

## 비목표 (Out of scope)

- 레진/개척력/배터리 등 자원 회복 타이머 조회 (hoyoverse-checkin의 부가기능, 이번 스코프 아님)
- 다중 계정 지원 (게임당 1계정 전제. 확장 필요시 추후 별도 스펙)
- 아이디/비밀번호를 입력받아 대신 로그인해주는 기능 (모든 게임에서 미사용 — 아래 "인증 모델" 참고)

## 인증 모델 (공통 원칙)

5개 게임 전부 **기존 로그인 세션 재사용** 방식이다. 확장이 하는 일은:

1. 사용자가 각 사이트에 브라우저로 정상 로그인(수동, 최초 1회)
2. 확장이 `chrome.cookies` API(쿠키) 또는 content script(localStorage — 쿠키 API로 못 읽는 값)로 필요한 인증값을 읽어와 `chrome.storage.local`에 저장
3. 이후 `background` 서비스워커가 알람 주기마다 저장된 인증값을 실어 출석체크 API를 직접 호출

비밀번호를 직접 다루는 게임은 없다. "자동로그인"은 곧 "이미 로그인된 세션을 자동으로 재사용"을 의미하며, 이는 hoyoverse-checkin(원신/스타레일/ZZZ 레퍼런스)과 kgyujin/endfield-auto-checkin의 확인된 전제와 동일하다.

## 게임별 구현 상세

### 원신 / 붕괴: 스타레일 / 젠레스 존 제로 (HoYoverse)

레퍼런스: [j2i5ll/hoyoverse-checkin](https://github.com/j2i5ll/hoyoverse-checkin)

- **필요 쿠키**: `ltoken_v2`, `ltuid_v2` (도메인 `.hoyolab.com`) — `chrome.cookies.getAll({domain:'.hoyolab.com'})`로 읽음
- **엔드포인트** (게임별 `act_id`만 다름):
  | 게임 | API | act_id |
  |---|---|---|
  | 원신 | `POST https://sg-hk4e-api.hoyolab.com/event/sol/sign` | `e202102251931481` |
  | 스타레일 | `POST https://sg-public-api.hoyolab.com/event/luna/os/sign` | `e202303301540311` |
  | ZZZ | `POST https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign` | `e202406031448091` |
- **요청 방식**: `chrome.declarativeNetRequest.updateSessionRules`로 요청 헤더 `Cookie: ltoken_v2=...; ltuid_v2=...`를 세션 규칙으로 임시 주입한 뒤 `fetch(url, {credentials:'omit'})` — 이유: MV3 서비스워커의 일반 fetch는 자동으로 해당 사이트 쿠키를 안 실어주므로, 읽어온 쿠키값을 명시적으로 헤더에 꽂아야 함
- **서명**: 없음(공개 API, 로그인 쿠키만 요구). ZZZ만 헤더 `x-rpc-signgame: zzz` 추가 필요
- **재시도**: `retcode` 기반 — `429`(TooManyRequests)는 1~2초 랜덤 지연 후 재시도, `AlreadyCheckIn`은 성공으로 취급

### 엔드필드 (SKPORT)

레퍼런스: [canaria3406/skport-auto-sign](https://github.com/canaria3406/skport-auto-sign) (getToken.js + main-discord.gs에서 실제 서명 알고리즘 확인)

- **필요 인증값**:
  - `SK_OAUTH_CRED_KEY` — 쿠키, 도메인 `game.skport.com`
  - `SK_TOKEN_CACHE_KEY` — **localStorage** (쿠키 아님 — `chrome.cookies`로 못 읽음, content script를 `game.skport.com`에 주입해 `localStorage.getItem('SK_TOKEN_CACHE_KEY')`로 읽어야 함)
  - Endfield 게임 role id (`id`) + 서버(`server`: Asia=2, Americas/Europe=3) — 최초 등록 시 사용자 입력 또는 페이지에서 자동 추출
- **엔드포인트**: `POST https://zonai.skport.com/web/v1/game/endfield/attendance`
- **서명 알고리즘** (HMAC-SHA256 → MD5, 시크릿은 `SK_TOKEN_CACHE_KEY`):
  ```
  stringToSign = path + body(POST는 body, GET은 query) + timestamp + JSON.stringify({platform, timestamp, dId:"", vName})
  hmacHex = HMAC-SHA256(stringToSign, SK_TOKEN_CACHE_KEY) → hex
  sign = MD5(hmacHex) → hex
  ```
- **필수 헤더**: `cred`(=SK_OAUTH_CRED_KEY), `sk-game-role`(=`3_{roleId}_{server}`), `sk-language`, `timestamp`, `sign`, `platform:3`, `vName:1.0.0`, `Referer:https://game.skport.com/`, `Origin:https://game.skport.com`
- **토큰 만료 감지**: 응답 `code === 10000` → "토큰 만료, 재방문 필요" 표시 (재로그인 자동화 없음 — 사용자가 skport 사이트 재방문해서 confirm content script가 새 토큰 재캡처)
- **비공식 API 리스크**: 문서화 안 된 API라 skport 쪽 변경 시 조용히 깨질 수 있음. 실패 시 에러 메시지에 원문 코드/메시지 그대로 노출해서 디버깅 가능하게.

### 니케 (BLABLALINK)

레퍼런스 없음 — `www.blablalink.com/mission` 페이지의 프로덕션 JS 번들(`index-*.js`, `v4-*.js`)을 직접 받아 정적 분석해서 아래 내용 확인함(2026-08-25 기준).

- **필요 인증값**: 없음(!) — `www.blablalink.com` 로그인 시 서버가 발급하는 **httpOnly 세션 쿠키**만 있으면 됨. 클라이언트가 읽거나 저장할 토큰 자체가 존재하지 않음(HMAC 서명도 없음 — 4게임 중 가장 단순)
- **호출 방식**: `fetch(url, {credentials:'include'})` — 확장의 `host_permissions`에 `*://*.blablalink.com/*`만 있으면 브라우저가 세션 쿠키를 자동으로 실어줌. `chrome.cookies`로 읽어올 필요조차 없음
- **베이스 URL**: `https://api.blablalink.com`
- **호출 순서** (2단계):
  1. `GET /lip/proxy/lipass/Points/GetTaskListWithStatusV2?get_top=true&intl_game_id=29080` → 응답의 `tasks[]`에서 `task_type === 1`(DailyCheckIn)인 항목의 `task_id` 추출. 이미 완료면 `is_completed === true`
  2. `POST /lip/proxy/lipass/Points/DailyCheckIn` body `{"task_id": <위에서 얻은 값>}`
- **intl_game_id**: `29080` 고정 (니케 "JP/KR/NA/SEA/Global" 리전 — 한국 계정 해당). `29157`은 별도 리전(HK/MC/TW)이라 사용 안 함
- **필수 헤더** `x-common-params` (JSON.stringify, 전부 비밀 아닌 메타값):
  ```json
  {"game_id":"16","area_id":"global","source":"<client_type>","intl_game_id":"29080","language":"ko","env":"prod","data_statistics_scene":"outer","data_statistics_page_id":"https://www.blablalink.com/mission","data_statistics_client_type":"<client_type>","data_statistics_lang":"ko"}
  ```
  `x-language: ko`, `x-channel-type: 2`도 함께
- **에러**: `NOT_BOUND_LIP`(303013) — 사용자가 blablalink에 NIKKE 게임 계정을 링크(bind)하지 않은 상태. 확장이 자동 처리할 수 없는 사용자 액션이므로 팝업에 "블라블라링크에서 니케 계정 연동 필요"로 안내만 함

## 확장 구조

```
manifest.json           # MV3, permissions: storage/cookies/alarms/declarativeNetRequest, host_permissions: hoyolab/hoyoverse/skport/blablalink
background/
  index.ts               # 서비스워커 진입점, alarm 등록
  alarm.ts                # chrome.alarms 래퍼 (hoyoverse-checkin AlarmManager 패턴 재사용)
  services/
    GenshinCheckInService.ts
    StarrailCheckInService.ts
    ZzzCheckInService.ts
    EndfieldCheckInService.ts
    NikkeCheckInService.ts
  common/
    http.ts               # declarativeNetRequest 쿠키주입 fetch 래퍼 (HoYo용) + credentials:include fetch 래퍼 (니케용)
    sign.ts                # 엔드필드 HMAC-SHA256→MD5 서명 함수
    storage.ts             # chrome.storage.local 계정/토큰 저장 스키마
content-scripts/
  skport-capture.ts        # game.skport.com 방문 시 SK_TOKEN_CACHE_KEY(localStorage) 캡처 → background로 postMessage
                            # (HoYo/니케는 content script 불필요 — 쿠키는 background가 chrome.cookies로 직접 읽음)
popup/
  Popup.tsx                # 계정별 등록상태 + 최근 출석 결과 목록
```

각 `*CheckInService`는 "이 게임에 등록된 계정 있는가 → 인증값 유효한가 → API 호출 → 결과 반환" 하나의 좁은 책임만 진다. `background/index.ts`는 5개 서비스를 순회 호출하고 결과를 `storage.ts`에 기록할 뿐, 게임별 API 지식은 갖지 않는다.

## 데이터 흐름

1. 사용자가 popup에서 "계정 등록" 클릭 → 해당 게임 사이트를 새 탭으로 열도록 안내(이미 로그인되어 있어야 함)
2. content script(스킨포트만 해당, 나머지는 background가 직접 쿠키 읽음)가 필요 토큰 캡처 → `chrome.runtime.sendMessage`로 background에 전달 → `chrome.storage.local`에 저장, popup에 "등록됨" 반영
3. `chrome.alarms`가 30분 주기(고정, hoyoverse-checkin과 동일값)로 background를 깨움 → 5개 서비스 순회, 등록된 계정만 호출 → 결과를 `chrome.storage.local`의 로그 배열에 append (최근 50개 유지, hoyoverse-checkin 패턴)
4. popup 열 때마다 로그 읽어서 게임별 최신 상태(성공/이미완료/실패/토큰만료) 배지 표시

## 에러 처리

| 상황 | 처리 |
|---|---|
| 토큰/쿠키 없음(미등록) | 해당 게임 스킵, popup에 "미등록" 표시 |
| 토큰 만료(HoYo `AuthExpired`/`NotLoggedIn`, skport `code:10000`, 니케 세션쿠키 만료 401) | "재등록 필요" 배지, 재시도 안 함(무한루프 방지) |
| 429 Too Many Requests | 1~2초 랜덤 지연 후 1회 재시도, 재실패시 다음 알람까지 대기 |
| 니케 `NOT_BOUND_LIP` | "게임 계정 연동 필요" 안내, 확장이 대신 할 수 없는 사용자 액션이므로 그대로 실패 로그 |
| 알 수 없는 응답 코드 | 원문 메시지 그대로 로그에 남김(증상 숨기지 않음) |

## 테스트

- 각 `*CheckInService`의 서명/헤더 조립 로직은 유닛 테스트로 검증(실제 네트워크 호출 없이, mock 응답으로 성공/이미완료/토큰만료/429 분기 커버)
- `sign.ts`(엔드필드 HMAC)는 canaria3406 소스의 실제 알려진 입출력 쌍으로 골든 테스트
- 실제 API 호출 통합 테스트는 개발자 본인 계정으로 수동 1회 검증(자동화된 CI에서는 실제 로그인 세션이 없으므로 스킵)

## 알려진 리스크 (기록만, 처리는 안 함)

- 엔드필드/니케 둘 다 비공식 API — 사이트 리뉴얼 시 조용히 깨질 수 있음. 매니페스트 버전과 별개로 "마지막 정상 확인일"을 README에 기록해두는 정도로만 대응
- 니케 `intl_game_id=29080`은 코드에 하드코딩 — 계정이 다른 리전(HK/MC/TW=29157)이면 안 맞음. 이번 스코프는 한국 계정(글로벌 리전) 기준
