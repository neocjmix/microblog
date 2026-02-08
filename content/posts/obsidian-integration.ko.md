---
title: "Obsidian으로 AI와 협업하기: 마크다운 기반 워크플로우"
date: 2026-02-09
---

> 환경: MacBook Air M2 + iPhone 15 Pro
> 목표: Mac-iPhone 간 seamless한 마크다운 협업
> 소요시간: 약 2시간 (삽질 포함)

---

## 왜 Obsidian인가?

AI와 협업하다 보면 대부분의 결과물이 **마크다운**으로 나온다.

- Claude: 코드, 문서, 가이드 → `.md`
- ChatGPT: 기획, 아이디어, 초안 → `.md`
- OpenClaw: 작업 로그, 메모리 파일 → `.md`

이걸 어디에 정리할까?
- VS Code? 코딩용이지, 노트 앱은 아니다
- Bear/Apple Notes? 마크다운 지원이 제한적
- Notion? API 연동은 귀찮고, 오프라인에서 느림

**Obsidian이 답인 이유:**
- 순수 마크다운 파일 (플랫폼 독립적)
- iCloud로 Mac-iPhone 동기
- Wikilink로 문서 간 연결
- 로컬 파일 시스템 직접 접근
- CLI 도구 (`obsidian-cli`) 제공

즉, AI가 생성한 파일을 그대로 vault에 넣으면 끝.

---

## 기존 구조의 문제

OpenClaw 셋업 완료 후 이런 구조로 시작했다:

```
~/openclaw-workspace/          # OpenClaw 작업 공간
~/Documents/microblog-vault/   # 블로그 포스트
```

**문제점:**
1. **접근성**: iPhone에서 파일 못 봄
2. **분산**: 작업 파일과 블로그가 분리됨
3. **동기화**: Git 수동 푸시/풀 필요

대화 예시:
```
나: 아이폰에서도 파일 보고 싶은데

맥북: 그럼 iCloud 동기 해야지

나: 근데 OpenClaw workspace를 옮기면 시스템이 깨지지 않을까?

맥북: 심볼릭 링크 쓰면 돼
```

---

## 최종 구조

### 1. 3개 Vault 통합

**iCloud Obsidian 위치** (`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/`):

```
Obsidian/
├── workspace/          # OpenClaw 작업 공간 (90+ 파일)
│   ├── SOUL.md
│   ├── MEMORY.md
│   ├── skills/
│   ├── memory/
│   └── ...
├── ChatGPT/            # ChatGPT 대화 백업 (3,263 파일)
│   ├── 0001_*.md
│   ├── 0002_*.md
│   └── ...
└── microblog-vault/    # 블로그 포스트 (드래프트/템플릿)
    ├── posts/
    ├── drafts/
    └── templates/
```

**각 vault의 역할:**

| Vault | 용도 | 파일 수 |
|-------|------|---------|
| workspace | OpenClaw 메모리, 스킬, 설정 | 90+ |
| ChatGPT | ChatGPT 대화 기록 아카이브 | 3,263 |
| microblog-vault | 블로그 콘텐츠 관리 | ~10 |

### 2. 심볼릭 링크 유지

OpenClaw는 `~/.openclaw/workspace`에서 파일을 찾는다.
iCloud로 이동하면 경로가 바뀌는데, 심볼릭 링크로 해결:

```bash
# 기존 workspace 백업
mv ~/.openclaw/workspace ~/.openclaw/workspace.bak

# iCloud 위치로 심볼릭 링크
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace \
      ~/.openclaw/workspace

# OpenClaw 재시작
openclaw gateway restart
```

**결과:**
- OpenClaw: `~/.openclaw/workspace`로 접근 (시스템 의존성 유지)
- Obsidian: iCloud 경로로 접근 (동기화)
- iPhone: Obsidian 앱에서 3개 vault 모두 접근

---

## 이전 과정

### 1. workspace vault 이전

```bash
# 기존 파일 복사
cp -r ~/.openclaw/workspace/* \
   ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace/

# 원본 삭제 & 심볼릭 링크
rm -rf ~/.openclaw/workspace
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace \
      ~/.openclaw/workspace
```

**주의:**
- `.git/` 폴더는 제외 (Obsidian vault는 Git 저장소일 필요 없음)
- 권한 확인 (`chmod 700`)

### 2. microblog-vault 이전

```bash
# 기존 위치
~/Documents/microblog-vault/

# → iCloud로 이동
mv ~/Documents/microblog-vault \
   ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/

# 심볼릭 링크 (선택)
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/microblog-vault \
      ~/Documents/microblog-vault
```

### 3. ChatGPT 대화 백업 복원

ChatGPT에서 대화 기록을 JSON 형식으로 내보낼 수 있다.
(`Settings > Data controls > Export data`)

**문제:** 3,317개의 대화가 JSON 배열로 저장됨

**해결:** Python 스크립트로 변환

```python
# scripts/chatgpt_to_obsidian.py
import json
from pathlib import Path
from datetime import datetime

export_file = Path("~/Documents/ChatGPT-Export/conversations.json")
output_dir = Path("~/Library/Mobile Documents/iCloud~md~obsidian/Documents/ChatGPT/")

with open(export_file) as f:
    data = json.load(f)

for i, conv in enumerate(data, 1):
    title = conv.get("title", "Untitled")
    conv_id = conv.get("id", "unknown")
    create_time = conv.get("create_time", 0)
    date_str = datetime.fromtimestamp(create_time).strftime("%Y-%m-%d")
    
    # 파일명 생성 (인덱스 + 제목 + ID)
    filename = f"{i:04d}_{title[:50]}_{conv_id[:8]}.md"
    
    # Frontmatter + 대화 내용
    content = f"""---
title: "{title}"
date: {date_str}
conversation_id: {conv_id}
---

{conv.get("content", "")}
"""
    
    output_path = output_dir / filename
    output_path.write_text(content)
```

**실행:**
```bash
python scripts/chatgpt_to_obsidian.py
# ✅ 3,263 conversations converted (54 empty skipped)
# 📁 87MB of markdown files generated
```

---

## Obsidian 설정

### 1. Vault 등록

Mac에서:
```bash
# obsidian-cli 설치
brew install obsidian

# vault 등록
obsidian-cli open workspace
obsidian-cli open ChatGPT
obsidian-cli open microblog-vault
```

iPhone에서:
1. Obsidian 앱 실행
2. "Open folder as vault" → iCloud Drive
3. `iCloud~md~obsidian/Documents/` 이동
4. `workspace`, `ChatGPT`, `microblog-vault` 각각 등록

### 2. 플러그인 (선택)

**추천 플러그인:**
- **Dataview**: 메타데이터 쿼리 (예: 최근 7일 메모리)
- **Templater**: 템플릿 자동화 (새 포스트 생성)
- **Obsidian Git**: 자동 Git 커밋/푸시 (선택)

**주의:** iPhone에서는 플러그인 제한적

---

## 동기화 확인

### 테스트 1: Mac → iPhone

```bash
# Mac에서 파일 생성
echo "# Test from Mac" > \
  ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace/test-sync.md

# 30초 대기 (iCloud 동기)

# iPhone Obsidian 앱에서 확인
# ✅ test-sync.md 보임
```

### 테스트 2: iPhone → Mac

iPhone에서:
1. Obsidian 앱 열기
2. workspace vault 진입
3. 새 노트 생성: "Test from iPhone"

Mac에서:
```bash
# 1분 대기 (iCloud 동기)
ls ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace/
# ✅ Test from iPhone.md 보임
```

---

## 실제 사용 시나리오

### 시나리오 1: 외출 중 아이디어 기록

iPhone에서:
1. Obsidian 앱 → workspace vault
2. `memory/2026-02-09.md` 열기
3. 아이디어 추가

집에 도착 후:
```
나: (Telegram) 오늘 메모리 읽고 정리해줘

맥북: (memory/2026-02-09.md 읽기)
      3개 아이디어 발견! MEMORY.md에 추가할게
```

### 시나리오 2: 블로그 포스트 작성

Mac에서:
1. Claude.ai에서 초안 작성
2. 복사 → Obsidian microblog-vault/drafts/ 붙여넣기
3. iPhone에서 이동 중 수정

Telegram에서:
```
나: drafts/threads-first-day.md 리뷰해줘

맥북: (파일 읽고 피드백)

나: 좋아, 이거 Threads에 게시해

맥북: (자동으로 6-part thread로 분할 + 게시)
      ✅ 게시 완료!
```

### 시나리오 3: ChatGPT 대화 검색

```
나: 예전에 ChatGPT에서 "에이전트 설계" 관련해서 뭐 물어봤었는데 찾아줘

맥북: (ChatGPT vault에서 검색)
      찾았어! 3개 대화:
      - 0245_Multi-Agent Architecture Design
      - 1089_Agent Memory Systems
      - 2341_Prompt Engineering for Agents
      
      내용 정리해줄까?
```

---

## 장점과 한계

### 장점

✅ **Mac-iPhone 완전 동기**: 어디서든 같은 파일  
✅ **플랫폼 독립적**: 순수 마크다운 (Obsidian 없이도 읽기 가능)  
✅ **AI 협업 최적화**: 모든 결과물이 자동으로 정리됨  
✅ **검색 강력**: Obsidian 전체 vault 통합 검색  
✅ **Wikilink**: 문서 간 연결로 지식 그래프 형성  

### 한계

⚠️ **iCloud 동기 지연**: 1-2분 소요 (실시간 아님)  
⚠️ **충돌 가능성**: 동시 편집 시 conflict 파일 생성됨  
⚠️ **스토리지 용량**: iCloud 무료 5GB (ChatGPT vault만 87MB)  
⚠️ **iPhone 플러그인 제한**: 대부분 플러그인 동작 안 함  

**해결책:**
- 동시 편집 피하기 (Mac에서 작업 중이면 iPhone은 읽기 전용)
- iCloud 용량 부족 시 ChatGPT vault만 로컬 보관
- 플러그인은 Mac에서만 활용

---

## 문서 구조 예시

### workspace vault

```
workspace/
├── SOUL.md              # AI 정체성
├── MEMORY.md            # 장기 메모리
├── USER.md              # 사용자 정보
├── AGENTS.md            # 에이전트 가이드
├── TOOLS.md             # 로컬 설정
├── skills/
│   ├── threads-playwright/
│   └── ...
├── memory/
│   ├── 2026-02-07.md
│   ├── 2026-02-08.md
│   ├── 2026-02-09.md
│   └── INDEX.md         # 메모리 인덱스
└── README.md            # Vault 네비게이션
```

**핵심:**
- `SOUL.md`는 AI의 성격 정의 → 모든 세션에서 로드
- `MEMORY.md`는 장기 메모리 → main session에서만 로드 (보안)
- `memory/YYYY-MM-DD.md`는 일일 로그 → 원시 데이터
- `README.md` + `INDEX.md`로 wikilink 네비게이션

### microblog-vault

```
microblog-vault/
├── posts/
│   ├── hello-world.ko.md
│   ├── openclaw-setup-guide.ko.md
│   └── obsidian-integration.ko.md
├── drafts/
│   └── threads-first-day.md
└── templates/
    └── post.md
```

**워크플로우:**
1. Claude/ChatGPT에서 작성
2. `drafts/`에 저장
3. 리뷰 후 `posts/`로 이동
4. OpenClaw가 Vercel에 배포

---

## Tips

### 1. Obsidian 명령어 (Mac)

```bash
# Vault 열기
obsidian-cli open workspace

# 특정 파일 열기
obsidian-cli open workspace/MEMORY.md

# 새 노트 생성
obsidian-cli new workspace "New Note Title"
```

### 2. iCloud 동기 속도 올리기

```bash
# iCloud 상태 확인
brctl log --wait --shorten

# 동기 강제 실행 (선택)
killall bird
```

### 3. 충돌 파일 정리

iCloud가 충돌을 감지하면 `filename (Conflicted Copy).md` 생성

**자동 정리 스크립트:**
```bash
find ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/ \
  -name "*Conflicted*" -delete
```

**주의:** 삭제 전 내용 확인 필수

---

## 비용

| 항목 | 비용 |
|------|------|
| Obsidian 라이선스 | **무료** (개인용) |
| iCloud 5GB | 무료 |
| iCloud 50GB | $0.99/월 (선택) |
| obsidian-cli | 무료 |

ChatGPT vault가 87MB라서 무료 5GB로는 부족할 수 있음.
50GB 플랜으로 업그레이드하거나, ChatGPT vault만 로컬 보관.

---

## 후기

**Before:**
- Mac에서만 작업 가능
- iPhone에서는 파일 못 봄
- Git으로 수동 동기 필요

**After:**
- Mac-iPhone 완전 동기
- 이동 중 iPhone으로 리뷰/수정
- AI가 생성한 파일 자동 정리

가장 큰 변화: **AI 협업의 continuity가 생겼다.**

이전에는 Claude에서 작성 → 복사 → 어디 저장? → 잊어버림

지금은 Claude/ChatGPT → Obsidian → OpenClaw가 자동 처리 → iPhone에서 확인

**마크다운 = 만국 공통어**

AI, 에디터, 블로그, 노트 앱 모두 마크다운을 지원한다.
Obsidian은 그 허브가 되어준다.

---

## 다음 단계

- [ ] Dataview로 "최근 7일 작업" 대시보드 만들기
- [ ] Templater로 일일 메모리 자동 생성
- [ ] iPhone Shortcuts + Obsidian URL scheme 연동
- [ ] ChatGPT vault 태그 시스템 구축

---

## 🔄 메타: 이 글도 Obsidian에서

이 포스트 자체가 Obsidian에서 작성됐다.

```
나: 마이크로블로그 포스팅 두 개 작성하자.
    1. 옵시디안 통합 작업 기록

맥북: 기존 포스팅 스타일 확인하고 작성할게

(10분 후)

맥북: 완료! drafts/obsidian-integration.ko.md
      리뷰해줘

나: (iPhone Obsidian 앱에서 읽기)
    좋아, 게시해

맥북: Vercel에 배포 완료 ✅
```

**지금 보고 있는 이 글이 그 결과물이다.**

---

## 참고 링크

- [Obsidian 공식 사이트](https://obsidian.md)
- [obsidian-cli (Homebrew)](https://formulae.brew.sh/formula/obsidian)
- [iCloud Drive 관리](https://support.apple.com/en-us/HT204025)
- [OpenClaw 문서화 가이드](https://docs.openclaw.ai)
