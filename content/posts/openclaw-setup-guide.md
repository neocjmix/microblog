---
title: "OpenClaw 셋업기: 맥북에어에서 모바일 개발 파이프라인 구축하기"
date: 2026-02-03
---

> 환경: MacBook Air M2 16GB
> 목표: Telegram으로 어디서든 코딩 → GitHub 푸시 → Vercel 배포
> 소요시간: 약 1시간

---

## OpenClaw가 뭔데?

OpenClaw(구 Clawdbot → Moltbot)는 로컬에서 실행되는 오픈소스 AI 에이전트다. 단순 챗봇이 아니라 **실제로 시스템을 제어**할 수 있다.

일반 챗봇: "이렇게 하면 돼요" (말만 함)
OpenClaw: "했어요" (진짜 함)

Telegram/WhatsApp/Discord로 명령을 보내면, 맥북에서 실행 중인 게이트웨이가 파일 생성, 코드 실행, Git 푸시, 배포까지 대신 해준다.

---

## 왜 이걸 하려고 했나

원하는 것:
- 밖에서 폰으로 개발 지시
- 웹검색 → 기획 → 코딩 → GitHub → 배포까지 모바일로
- 토이 프로젝트용 (프로덕션 아님)

결론: 개인 프로젝트라면 보안 좀 풀고 제대로 활용하는 게 낫다.

---

## 보안 고려사항

### 알려진 이슈들

| 이슈 | 대응 |
|----------------|-------------------|
| 평문 자격증명 저장 | 파일 권한 600/700 설정 |
| 인증 없는 게이트웨이 노출 | 토큰 인증 필수 |
| Prompt Injection | DM pairing으로 본인만 접근 |
| 악성 스킬 | 검증된 스킬만 사용 |

### 내 기준

✅ 이 맥북으로 할 것: 개발, 토이 프로젝트
❌ 이 맥북으로 안 할 것: 은행 로그인, 금융 서비스

OpenClaw에 browser 권한을 주면 브라우저 세션 접근이 가능하다. 개인 프로젝트 코드가 날아가는 건 괜찮아도, 금융 정보가 털리면 곤란하니까.

---

## 셋업 과정

### 1. 기존 설치 제거 (클린 설치)

예전에 clawdbot을 깔아뒀다면 완전히 제거:

```bash
# 프로세스 종료
openclaw gateway stop 2>/dev/null
clawdbot gateway stop 2>/dev/null

# npm 패키지 삭제
npm uninstall -g openclaw clawdbot moltbot

# 설정/데이터 삭제
rm -rf ~/.openclaw ~/.clawdbot ~/.moltbot

# launchd 데몬 제거
rm ~/Library/LaunchAgents/*openclaw*.plist 2>/dev/null
rm ~/Library/LaunchAgents/*clawdbot*.plist 2>/dev/null
```

### 2. 사전 준비

```bash
# Node.js 22+ 설치
brew install node@22
node --version  # v22.12.0 이상 확인

# OpenClaw 설치
npm install -g openclaw
```

### 3. 보안 설정 먼저 (온보딩 전에!)

```bash
# 디렉토리 생성
mkdir -p ~/.openclaw
chmod 700 ~/.openclaw

# 토큰 생성
openssl rand -hex 32  # 출력된 값 복사해두기
```

설정 파일 생성 (`~/.openclaw/openclaw.json`):

```json
{
  "gateway": {
    "bind": "loopback",
    "port": 21847,
    "auth": {
      "mode": "token",
      "token": "YOUR_GENERATED_TOKEN_HERE",
      "allowTailscale": false
    },
    "trustedProxies": []
  },
  "channels": {
    "telegram": {
      "dmPolicy": "pairing",
      "groups": {
        "*": {
          "requireMention": true
        }
      }
    }
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    }
  },
  "plugins": {
    "allow": []
  },
  "logging": {
    "redactSensitive": "tools"
  }
}
```

권한 설정:
```bash
chmod 600 ~/.openclaw/openclaw.json
```

**포인트:**
- `bind: "loopback"` → 127.0.0.1에서만 접근 (0.0.0.0 금지)
- port 변경 → 기본 포트 피하기
- `auth.token` 필수 → 인증 없으면 누구나 접근
- `dmPolicy: "pairing"` → 승인된 사람만 DM 가능
- `mdns.mode: "off"` → 로컬 네트워크에 존재 광고 안 함

### 4. 온보딩

```bash
openclaw onboard --install-daemon
```

선택 사항들:
- AI Provider: Anthropic (Claude 최적화)
- Tailscale: Off (나중에 설정)
- Node manager: npm (가장 안정적)
- Skills: clawhub, github 선택
- Hooks: boot-md, command-logger, session-memory 전부 선택

### 5. Telegram 봇 연결

**봇 생성:**
1. Telegram에서 @BotFather 검색
2. /newbot 입력
3. 이름과 username 설정 (username은 `bot`으로 끝나야 함)
4. API Token 복사

**OpenClaw에 연결:**
```bash
openclaw channels add --channel telegram --token "YOUR_BOT_TOKEN"
```

**페어링 승인:**
1. Telegram에서 봇에게 아무 메시지 전송
2. 페어링 코드 수신
3. 터미널에서 승인:
```bash
openclaw pairing list telegram
openclaw pairing approve telegram <코드>
```

### 6. API 키 문제 해결

401 에러가 나면 API 키 확인:
```bash
cat ~/.openclaw/agents/main/agent/auth-profiles.json
```

토큰이 잘렸거나 줄바꿈이 들어갔을 수 있다. 한 줄로 붙여넣어야 함:

```json
{
  "profiles": {
    "anthropic:default": {
      "type": "token",
      "provider": "anthropic",
      "token": "sk-ant-xxxxx..."
    }
  }
}
```

수정 후 재시작:
```bash
openclaw gateway restart
```

### 7. 연결 테스트

Telegram 봇에게:
```
안녕

~/openclaw-workspace 에 test.txt 만들어서 "셋업 완료" 써줘
```

맥북에서 확인:
```bash
cat ~/openclaw-workspace/test.txt
# 출력: 셋업 완료
```

---

## 개발 도구 연결

### Vercel

```bash
sudo chown -R $(whoami) ~/.npm  # 권한 문제 있으면
npx vercel login
```

### GitHub SSH

```bash
# 키 생성 (패스프레이즈 비워두기)
ssh-keygen -t ed25519 -C "openclaw-macbook" -f ~/.ssh/id_openclaw

# SSH config 설정
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_openclaw
  IdentitiesOnly yes
EOF

# 공개키 확인
cat ~/.ssh/id_openclaw.pub
```

GitHub (https://github.com/settings/keys)에 공개키 등록 후:
```bash
ssh -T git@github.com
# Hi username! You've successfully authenticated...
```

---

## Tailscale Serve (선택)

폰에서 Web UI로 접속하고 싶다면:

```bash
# Tailscale 설치
brew install --cask tailscale
open /Applications/Tailscale.app  # 로그인

# Serve 활성화
tailscale serve --bg http://127.0.0.1:21847

# 확인
tailscale serve status
```

처음엔 Tailscale 대시보드에서 Serve 기능 활성화 필요할 수 있음.

**주의:** Funnel은 인터넷 전체 공개라 위험. Serve만 켜면 내 기기들에서만 접근 가능.

솔직히 Telegram이 더 편해서 Web UI는 잘 안 쓰게 됨.

---

## 최종 상태 확인

```
openclaw status

Gateway   │ local · ws://127.0.0.1:21847 · auth token
Telegram  │ ON · OK
Sessions  │ claude-opus-4-5 (200k ctx)
```

---

## 이제 뭘 할 수 있나

Telegram에서:
```
"SolidJS로 랜딩페이지 만들어줘"
"GitHub에 'my-project' 저장소 만들어서 푸시해"
"Vercel에 배포해"
```

진짜로 실행된다. 밖에서 폰으로.

---

## 보안 강화 시점

토이 프로젝트로 시작해서 커지면:

| 단계 | 신호 | 조치 |
|------|---------|-------------|
| 현재 | 나 혼자 | 유지 |
| 1단계 | 다른 사람 데이터 | DB 분리 |
| 2단계 | 결제 연동 | credential 격리 |
| 3단계 | 사업화 | 인프라 완전 분리 |

---

## 후기

같은 Opus인데, Claude.ai의 나는 "가이드만" 해주고, OpenClaw의 Opus는 "실행을" 한다.

역할 분담이 명확해서 좋다.

다음엔 cron 설정해서 콘텐츠 자동 생성 파이프라인 만들어볼 예정.

---

## 참고 링크

- [OpenClaw 공식 문서](https://docs.openclaw.ai)
- [OpenClaw 보안 가이드](https://docs.openclaw.ai/gateway/security)
- [Tailscale Serve 문서](https://tailscale.com/kb/1242/tailscale-serve)
