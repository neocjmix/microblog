---
title: "Collaborating with AI Using Obsidian: A Markdown-Based Workflow"
date: 2026-02-09
---

> Environment: MacBook Air M2 + iPhone 15 Pro
> Goal: Seamless markdown collaboration between Mac and iPhone
> Time: ~2 hours (including trial and error)

---

## Why Obsidian?

When collaborating with AI, most outputs come in **markdown** format.

- Claude: Code, docs, guides → `.md`
- ChatGPT: Planning, ideas, drafts → `.md`
- OpenClaw: Work logs, memory files → `.md`

Where should we organize all this?
- VS Code? It's for coding, not note-taking
- Bear/Apple Notes? Limited markdown support
- Notion? API integration is tedious, offline is slow

**Why Obsidian is the answer:**
- Pure markdown files (platform-independent)
- Syncs via iCloud between Mac and iPhone
- Wikilinks for document connections
- Direct access to local file system
- CLI tool (`obsidian-cli`) available

In other words, just drop AI-generated files into the vault and you're done.

---

## Problems with the Original Structure

After completing the OpenClaw setup, I started with this structure:

```
~/openclaw-workspace/          # OpenClaw workspace
~/Documents/microblog-vault/   # Blog posts
```

**Issues:**
1. **Accessibility**: Can't view files from iPhone
2. **Fragmentation**: Work files and blog separated
3. **Sync**: Manual Git push/pull required

Example conversation:
```
Me: I want to view files from my iPhone too

MacBook: Then we need iCloud sync

Me: But won't moving the OpenClaw workspace break the system?

MacBook: We can use symbolic links
```

---

## Final Structure

### 1. Three Vaults Integrated

**iCloud Obsidian location** (`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/`):

```
Obsidian/
├── workspace/          # OpenClaw workspace (90+ files)
│   ├── SOUL.md
│   ├── MEMORY.md
│   ├── skills/
│   ├── memory/
│   └── ...
├── ChatGPT/            # ChatGPT conversation backups (3,263 files)
│   ├── 0001_*.md
│   ├── 0002_*.md
│   └── ...
└── microblog-vault/    # Blog posts (drafts/templates)
    ├── posts/
    ├── drafts/
    └── templates/
```

**Role of each vault:**

| Vault | Purpose | File Count |
|-------|---------|------------|
| workspace | OpenClaw memory, skills, config | 90+ |
| ChatGPT | ChatGPT conversation archive | 3,263 |
| microblog-vault | Blog content management | ~10 |

### 2. Maintaining Symbolic Links

OpenClaw looks for files in `~/.openclaw/workspace`.
Moving to iCloud changes the path, but we solve this with symbolic links:

```bash
# Backup existing workspace
mv ~/.openclaw/workspace ~/.openclaw/workspace.bak

# Create symbolic link to iCloud location
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace \
      ~/.openclaw/workspace

# Restart OpenClaw
openclaw gateway restart
```

**Result:**
- OpenClaw: Accesses via `~/.openclaw/workspace` (maintains system dependency)
- Obsidian: Accesses via iCloud path (sync enabled)
- iPhone: All 3 vaults accessible via Obsidian app

---

## Migration Process

### 1. Migrating workspace Vault

```bash
# Copy existing files
cp -r ~/.openclaw/workspace/* \
   ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace/

# Remove original & create symbolic link
rm -rf ~/.openclaw/workspace
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace \
      ~/.openclaw/workspace
```

**Caution:**
- Exclude `.git/` folder (Obsidian vault doesn't need to be a Git repo)
- Check permissions (`chmod 700`)

### 2. Migrating microblog-vault

```bash
# Original location
~/Documents/microblog-vault/

# → Move to iCloud
mv ~/Documents/microblog-vault \
   ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/

# Symbolic link (optional)
ln -s ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/microblog-vault \
      ~/Documents/microblog-vault
```

### 3. Restoring ChatGPT Conversation Backups

ChatGPT allows exporting conversation history in JSON format.
(`Settings > Data controls > Export data`)

**Problem:** 3,317 conversations stored in a JSON array

**Solution:** Convert with Python script

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
    
    # Generate filename (index + title + ID)
    filename = f"{i:04d}_{title[:50]}_{conv_id[:8]}.md"
    
    # Frontmatter + conversation content
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

**Execution:**
```bash
python scripts/chatgpt_to_obsidian.py
# ✅ 3,263 conversations converted (54 empty skipped)
# 📁 87MB of markdown files generated
```

---

## Obsidian Setup

### 1. Vault Registration

On Mac:
```bash
# Install obsidian-cli
brew install obsidian

# Register vaults
obsidian-cli open workspace
obsidian-cli open ChatGPT
obsidian-cli open microblog-vault
```

On iPhone:
1. Launch Obsidian app
2. "Open folder as vault" → iCloud Drive
3. Navigate to `iCloud~md~obsidian/Documents/`
4. Register each: `workspace`, `ChatGPT`, `microblog-vault`

### 2. Plugins (Optional)

**Recommended plugins:**
- **Dataview**: Query metadata (e.g., last 7 days of memory)
- **Templater**: Template automation (new post creation)
- **Obsidian Git**: Auto Git commit/push (optional)

**Note:** Plugins are limited on iPhone

---

## Sync Verification

### Test 1: Mac → iPhone

```bash
# Create file on Mac
echo "# Test from Mac" > \
  ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace/test-sync.md

# Wait 30 seconds (iCloud sync)

# Check in iPhone Obsidian app
# ✅ test-sync.md visible
```

### Test 2: iPhone → Mac

On iPhone:
1. Open Obsidian app
2. Enter workspace vault
3. Create new note: "Test from iPhone"

On Mac:
```bash
# Wait 1 minute (iCloud sync)
ls ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/workspace/
# ✅ Test from iPhone.md visible
```

---

## Real-World Use Cases

### Scenario 1: Capturing Ideas While Out

On iPhone:
1. Obsidian app → workspace vault
2. Open `memory/2026-02-09.md`
3. Add ideas

Back home:
```
Me: (Telegram) Read today's memory and organize it

MacBook: (Reads memory/2026-02-09.md)
         Found 3 ideas! I'll add them to MEMORY.md
```

### Scenario 2: Writing Blog Posts

On Mac:
1. Draft written in Claude.ai
2. Copy → Paste into Obsidian microblog-vault/drafts/
3. Edit on iPhone during commute

Via Telegram:
```
Me: Review drafts/threads-first-day.md

MacBook: (Reads file and provides feedback)

Me: Good, post this to Threads

MacBook: (Automatically splits into 6-part thread + posts)
         ✅ Posted!
```

### Scenario 3: Searching ChatGPT Conversations

```
Me: I asked ChatGPT about "agent design" before, can you find it?

MacBook: (Searches ChatGPT vault)
         Found! 3 conversations:
         - 0245_Multi-Agent Architecture Design
         - 1089_Agent Memory Systems
         - 2341_Prompt Engineering for Agents
         
         Want me to summarize?
```

---

## Advantages and Limitations

### Advantages

✅ **Complete Mac-iPhone sync**: Same files everywhere  
✅ **Platform independence**: Pure markdown (readable without Obsidian)  
✅ **AI collaboration optimized**: All outputs automatically organized  
✅ **Powerful search**: Unified search across all vaults  
✅ **Wikilinks**: Document connections form knowledge graph  

### Limitations

⚠️ **iCloud sync delay**: Takes 1-2 minutes (not real-time)  
⚠️ **Potential conflicts**: Simultaneous editing creates conflict files  
⚠️ **Storage capacity**: Free iCloud 5GB (ChatGPT vault alone is 87MB)  
⚠️ **iPhone plugin limitations**: Most plugins don't work  

**Solutions:**
- Avoid simultaneous editing (if working on Mac, iPhone read-only)
- If iCloud storage insufficient, keep ChatGPT vault local only
- Use plugins on Mac only

---

## Document Structure Example

### workspace Vault

```
workspace/
├── SOUL.md              # AI identity
├── MEMORY.md            # Long-term memory
├── USER.md              # User info
├── AGENTS.md            # Agent guide
├── TOOLS.md             # Local config
├── skills/
│   ├── threads-playwright/
│   └── ...
├── memory/
│   ├── 2026-02-07.md
│   ├── 2026-02-08.md
│   ├── 2026-02-09.md
│   └── INDEX.md         # Memory index
└── README.md            # Vault navigation
```

**Key points:**
- `SOUL.md` defines AI personality → Loaded in all sessions
- `MEMORY.md` is long-term memory → Loaded in main session only (security)
- `memory/YYYY-MM-DD.md` are daily logs → Raw data
- `README.md` + `INDEX.md` for wikilink navigation

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

**Workflow:**
1. Write in Claude/ChatGPT
2. Save to `drafts/`
3. After review, move to `posts/`
4. OpenClaw deploys to Vercel

---

## Tips

### 1. Obsidian Commands (Mac)

```bash
# Open vault
obsidian-cli open workspace

# Open specific file
obsidian-cli open workspace/MEMORY.md

# Create new note
obsidian-cli new workspace "New Note Title"
```

### 2. Speeding Up iCloud Sync

```bash
# Check iCloud status
brctl log --wait --shorten

# Force sync (optional)
killall bird
```

### 3. Cleaning Up Conflict Files

iCloud creates `filename (Conflicted Copy).md` when detecting conflicts

**Auto-cleanup script:**
```bash
find ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/ \
  -name "*Conflicted*" -delete
```

**Caution:** Review contents before deletion

---

## Cost

| Item | Cost |
|------|------|
| Obsidian License | **Free** (personal use) |
| iCloud 5GB | Free |
| iCloud 50GB | $0.99/month (optional) |
| obsidian-cli | Free |

ChatGPT vault is 87MB, so free 5GB might be insufficient.
Either upgrade to 50GB plan or keep ChatGPT vault local only.

---

## Retrospective

**Before:**
- Work only possible on Mac
- Can't view files from iPhone
- Manual sync via Git required

**After:**
- Complete Mac-iPhone sync
- Review/edit from iPhone during commute
- AI-generated files auto-organized

Biggest change: **AI collaboration gained continuity.**

Before: Write in Claude → Copy → Where to save? → Forget

Now: Claude/ChatGPT → Obsidian → OpenClaw auto-processes → Check on iPhone

**Markdown = Universal language**

AI, editors, blogs, note apps all support markdown.
Obsidian becomes the hub.

---

## Next Steps

- [ ] Create "Last 7 days work" dashboard with Dataview
- [ ] Auto-generate daily memory with Templater
- [ ] iPhone Shortcuts + Obsidian URL scheme integration
- [ ] Build tagging system for ChatGPT vault

---

## 🔄 Meta: This Post Was Also Written in Obsidian

This post itself was written in Obsidian.

```
Me: Let's write two microblog posts.
    1. Obsidian integration work log

MacBook: I'll check existing post style and write

(10 minutes later)

MacBook: Done! drafts/obsidian-integration.ko.md
         Please review

Me: (Read in iPhone Obsidian app)
    Good, publish it

MacBook: Deployed to Vercel ✅
```

**This post you're reading is the result.**

---

## References

- [Obsidian Official Site](https://obsidian.md)
- [obsidian-cli (Homebrew)](https://formulae.brew.sh/formula/obsidian)
- [iCloud Drive Management](https://support.apple.com/en-us/HT204025)
- [OpenClaw Documentation Guide](https://docs.openclaw.ai)
