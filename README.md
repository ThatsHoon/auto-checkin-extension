# Multi-Game Auto Check-in

원신 / 붕괴: 스타레일 / 젠레스 존 제로 / 명일방주: 엔드필드 / 승리의여신: 니케 자동 출석체크 Chrome 확장.

## 설치 (개발자 모드)

1. `chrome://extensions` 접속, "개발자 모드" 활성화
2. "압축해제된 확장 프로그램을 로드합니다" → 이 프로젝트 루트 선택

## 계정 등록

- **원신/스타레일/ZZZ**: `hoyolab.com`에 브라우저로 로그인만 하면 끝. 확장이 쿠키를 직접 읽음, 별도 등록 버튼 없음.
- **엔드필드**:
  1. `https://game.skport.com/endfield/sign-in`에 로그인 상태로 한 번 방문 (localStorage 토큰 캡처됨)
  2. 확장 팝업에서 Role ID + 서버(Asia/Americas-Europe) 입력 후 저장
- **니케**: `blablalink.com`에 로그인 + NIKKE 게임 계정 연동(bind)만 하면 끝. 별도 등록 없음.

## 테스트

```bash
npm test
```

## 수동 검증 체크리스트 (자동화 불가 — 실제 로그인 세션 필요)

- [ ] 5개 게임 모두 로그인 상태에서 팝업의 "지금 체크인 실행" 클릭 → 로그에 `success` 또는 `already` 기록되는지 확인
- [ ] 쿠키/토큰 삭제 후 재실행 → `unregistered`/`expired`/`not_logged_in` 중 하나가 정확히 기록되는지 확인
- [ ] 브라우저 재시작 후 알람이 살아있는지 (`chrome://extensions` → 확장 세부정보 → 서비스워커 콘솔에서 `ensureCheckInAlarm` 로그 확인)

## 알려진 리스크

- 엔드필드/니케는 비공식 API(공식 문서 없음, 리버스엔지니어링 결과) — 사이트 개편 시 예고 없이 깨질 수 있음
- 마지막 정상 확인일: 2026-08-25
- 니케 `intl_game_id=29080`은 글로벌(JP/KR/NA/SEA) 리전 전용 — HK/MC/TW 계정은 미지원
