---
title: "opencode-mobile-gateway 운영 정리: MVP 정리에서 my-dev-bot 분리 정착까지"
date: 2026-02-20
---

애들 키우면서 사이드 프로젝트를 굴리는 건 시간의 문제가 아니라 집중 시간의 문제다.
한 시간짜리로 딱 앉아 있을 수 있는 날이 일주일에 몇 번이나 되는지 모르겠다. 그런데 에이전틱 코딩은 그 한 시간을 더 쓰게 해줬다.

문제는 그 한 시간이 노트북 앞이 아니라는 점이었다.
TUI 환경을 모바일로 쓰는 건 특히 고통스럽다. 그래서 OpenClaw로 텔레그램 명령 기반 루프를 붙인 뒤, 텔레그램을 오케스트레이션 채널로 쓰는 구조로 바뀌었다.

다만 OpenClaw는 개발 전용 도구는 아니고, 토큰 소모가 컸다.
평소에 Claude Code, Codex CLI, 그리고 `omo`로 일하다가, 같은 패턴의 게이트웨이를 직접 만들기로 방향을 잡았다.

## 1) 시작: 기능보다 운영이 먼저 드러난 이유

처음부터 제약이 있었다.
- 모바일에서 스캐폴딩해야 했고
- 완성 뒤엔 스스로 수정·복구까지 처리해야 했고
- 즉, OpenClaw를 복구 레이어로 병행해야 했다.

OpenClaw의 gateway 패턴을 포크해 MVP를 먼저 만들고, 돌아가는 상태를 유지한 채 자기 자신을 개선하도록 했다.

초기 구조는 빠르게 만들어졌다.
- `opencode` 실행은 `--format json`으로 이벤트를 받는 방식
- `step_start / step_finish / text / tool_use / raw` 파싱
- `md2html`로 텔레그램 메시지 변환 + 길이 분할
- `/onboard`, `/repos`, `/connect`, `/whereami`, `/status`, `/session`, `/reset` 연결

기능은 붙었는데 운영에서 바로 병목이 생겼다.
`opencode_mobile_gateway`(MVP)와 `opencode_mobile_gateway_dev`(실험)이 병존했고, 거기에 `hermux`명령도 얽히면서 상태 판단이 어려워졌다.

소스를 수정할 때마다 데몬이 죽고 재시작되는 상황이 반복됐다.
원인을 뒤집어보면 단순했다.
`SIGKILL` 루프는 코어 버그보다 **동일 토큰 중복 폴링**이 더 결정적이었다.
동일 토큰으로 데몬 두 개가 떠 있으면 Telegram은 `ETelegram` 충돌을 반복한다.

## 2) 구조 정비: MVP를 지우고 기준점을 하나로

결국 구조를 다시 정렬했다.
- `opencode_mobile_gateway`(MVP) 삭제
- 기준점은 `@hermux/cli`로 단일화
- `opencode_mobile_gateway_dev`는 복제해 `my-dev-bot` 분리
- `hermux` / `opencode-mobile-gateway` / `my-dev-bot` 명령/문서/바이너리 문자열 정합성 정리

현재 운영 구도는 이렇게 잡혔다.

- **@hermux/cli**(안정 기준선)
  - 글로벌 명령: `hermux`, `opencode-mobile-gateway`
  - 토큰: `8016336***:AAESxpVpC-...`(별도 관리)
  - repo: `hello-world-repo`
  - workdir: `/Users/chanjinpark/.openclaw/workspace/hello-world-repo`
  - chatId: `850202****`

- **my-dev-bot**(개발/실험)
  - 글로벌 명령: `my-dev-bot`
  - 토큰: `8543890***:AAFyCCyq...`(별도 관리)
  - repo: `hermux`
  - workdir: `/Users/chanjinpark/.openclaw/workspace/@hermux/cli`
  - chatId: `850202****`

두 패키지 모두 같은 코드 패턴이다.
- `src/gateway.js`: 라우팅/상태
- `src/lib/runner.js`: opencode 실행과 이벤트 파싱
- `src/lib/config.js`: `global + repos` 설정
- `config/instances.json`: 토큰/레포 매핑

`chatId`는 repo 하나에 하나만 매핑되며, 중복은 fail-fast로 막는다.

## 3) 운영 검증 기준

실제 체크는 늘 같은 3개이다.
1. `runtime/gateway.pid` 존재 여부
2. `runtime/gateway.log` 메시지
3. `ps`로 실제 데몬 프로세스 존재 확인

성공 신호는 단순하다.
- `polling with 1 bot for 1 repo(s), 1 chat id(s)`

문제 신호도 단순하다.
- `ETelegram` 반복 메시지 → 동일 토큰 다중 실행 의심
- 이런 경우 코드보다 먼저 현재 구동 중인 데몬/설정 소거가 맞다.

## 4) 결론

이번 정리는 `om`/토큰/명령어/문서 정리가 모여야만 실제 운영이 가능하다는 걸 다시 확인한 날이다.
기능은 빨리 붙일 수 있어도, 실행권을 잃으면 그건 쓸모가 없다.

다음은 이 정합성을 유지한 채
- CLI 툴 통합,
- 에이전트 기반 채팅 협업,
- 메신저 어댑터 확장,
- 나아가 전용 클라이언트로의 확장
을 차근차근 붙일 계획이다.

짧은 결론부터 말하면, 하루를 내내 앉아 있지 못해도 된다.
**한 시간짜리 집중 안에서 프롬프트 하나가 쌓이면, 루프는 계속 돈다.**