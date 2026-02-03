---
title: "OpenClaw Setup Guide: Building a Mobile Dev Pipeline on MacBook Air"
date: 2026-02-03
---

> Environment: MacBook Air M2 16GB
> Goal: Code from anywhere via Telegram → GitHub push → Vercel deploy
> Time: ~1 hour

---

## What is OpenClaw?

OpenClaw (formerly Clawdbot → Moltbot) is an open-source AI agent that runs locally. It's not just a chatbot—it can **actually control your system**.

Regular chatbot: "Here's how to do it" (just talks)
OpenClaw: "Done" (actually does it)

Send commands via Telegram/WhatsApp/Discord, and the gateway running on your Mac will create files, execute code, push to Git, and deploy—all on your behalf.

---

## Why I Wanted This

What I wanted:
- Direct development from my phone while out
- Web search → planning → coding → GitHub → deploy, all from mobile
- For toy projects (not production)

Conclusion: For personal projects, it's better to loosen security a bit and actually use the tool properly.

---

## Security Considerations

### Known Issues

| Issue | Mitigation |
|----------------|-------------------|
| Plaintext credential storage | Set file permissions 600/700 |
| Unauthenticated gateway exposure | Token auth required |
| Prompt Injection | DM pairing limits access to you only |
| Malicious skills | Use only verified skills |

### My Personal Guidelines

✅ What I'll do on this Mac: Development, toy projects
❌ What I won't do on this Mac: Banking, financial services

If you give OpenClaw browser permissions, it can access browser sessions. Losing personal project code is acceptable, but losing financial info is not.

---

## Setup Process

### 1. Remove Previous Installation (Clean Install)

If you had clawdbot installed before, remove it completely:

```bash
# Stop processes
openclaw gateway stop 2>/dev/null
clawdbot gateway stop 2>/dev/null

# Remove npm packages
npm uninstall -g openclaw clawdbot moltbot

# Delete config/data
rm -rf ~/.openclaw ~/.clawdbot ~/.moltbot

# Remove launchd daemons
rm ~/Library/LaunchAgents/*openclaw*.plist 2>/dev/null
rm ~/Library/LaunchAgents/*clawdbot*.plist 2>/dev/null
```

### 2. Prerequisites

```bash
# Install Node.js 22+
brew install node@22
node --version  # Verify v22.12.0 or higher

# Install OpenClaw
npm install -g openclaw
```

### 3. Security Setup First (Before Onboarding!)

```bash
# Create directory
mkdir -p ~/.openclaw
chmod 700 ~/.openclaw

# Generate token
openssl rand -hex 32  # Copy the output
```

Create config file (`~/.openclaw/openclaw.json`):

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

Set permissions:
```bash
chmod 600 ~/.openclaw/openclaw.json
```

**Key Points:**
- `bind: "loopback"` → Only accessible from 127.0.0.1 (never 0.0.0.0)
- Change port → Avoid default port
- `auth.token` required → Without auth, anyone can access
- `dmPolicy: "pairing"` → Only approved users can DM
- `mdns.mode: "off"` → Don't advertise presence on local network

### 4. Onboarding

```bash
openclaw onboard --install-daemon
```

Options:
- AI Provider: Anthropic (optimized for Claude)
- Tailscale: Off (configure later)
- Node manager: npm (most stable)
- Skills: Select clawhub, github
- Hooks: Select all of boot-md, command-logger, session-memory

### 5. Connect Telegram Bot

**Create Bot:**
1. Search for @BotFather on Telegram
2. Send /newbot
3. Set name and username (username must end with `bot`)
4. Copy API Token

**Connect to OpenClaw:**
```bash
openclaw channels add --channel telegram --token "YOUR_BOT_TOKEN"
```

**Approve Pairing:**
1. Send any message to the bot on Telegram
2. Receive pairing code
3. Approve in terminal:
```bash
openclaw pairing list telegram
openclaw pairing approve telegram <code>
```

### 6. Troubleshooting API Key Issues

If you get 401 errors, check your API key:
```bash
cat ~/.openclaw/agents/main/agent/auth-profiles.json
```

The token might be truncated or have line breaks. It must be on a single line:

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

Restart after fixing:
```bash
openclaw gateway restart
```

### 7. Connection Test

Send to Telegram bot:
```
Hello

Create test.txt in ~/openclaw-workspace with "Setup complete"
```

Verify on Mac:
```bash
cat ~/openclaw-workspace/test.txt
# Output: Setup complete
```

---

## Connecting Dev Tools

### Vercel

```bash
sudo chown -R $(whoami) ~/.npm  # If permission issues
npx vercel login
```

### GitHub SSH

```bash
# Generate key (leave passphrase empty)
ssh-keygen -t ed25519 -C "openclaw-macbook" -f ~/.ssh/id_openclaw

# Configure SSH
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_openclaw
  IdentitiesOnly yes
EOF

# Get public key
cat ~/.ssh/id_openclaw.pub
```

After adding public key to GitHub (https://github.com/settings/keys):
```bash
ssh -T git@github.com
# Hi username! You've successfully authenticated...
```

---

## Tailscale Serve (Optional)

If you want Web UI access from your phone:

```bash
# Install Tailscale
brew install --cask tailscale
open /Applications/Tailscale.app  # Log in

# Enable Serve
tailscale serve --bg http://127.0.0.1:21847

# Verify
tailscale serve status
```

You may need to enable Serve in the Tailscale dashboard first.

**Warning:** Funnel exposes to the entire internet—dangerous. Serve only allows access from your own devices.

Honestly, Telegram is more convenient, so I rarely use the Web UI.

---

## Final Status Check

```
openclaw status

Gateway   │ local · ws://127.0.0.1:21847 · auth token
Telegram  │ ON · OK
Sessions  │ claude-opus-4-5 (200k ctx)
```

---

## What Can You Do Now?

From Telegram:
```
"Build me a landing page with SolidJS"
"Create 'my-project' repo on GitHub and push"
"Deploy to Vercel"
```

It actually executes. From your phone. Outside.

---

## When to Strengthen Security

Starting as a toy project, then growing:

| Stage | Signal | Action |
|------|---------|-------------|
| Current | Just me | Maintain |
| Stage 1 | Other people's data | Separate DB |
| Stage 2 | Payment integration | Isolate credentials |
| Stage 3 | Business | Full infra separation |

---

## Takeaway

Same Opus, but Claude.ai's me "just guides," while OpenClaw's Opus "actually executes."

Clear role separation. I like it.

Next up: Setting up cron for automated content generation pipeline.

---

## 🔄 Meta: How This Post Was Published

This post itself was created with OpenClaw.

After setup, this conversation happened on Telegram:

```
Me: Let's try something. Create a microblog and deploy to vercel

Macbook: Nice! 🚀
         Framework: Next.js?
         Data: Local JSON file for now?

Me: I'll write markdown with Claude or ChatGPT, organize in Obsidian,
    then tell you to publish and you deploy

Macbook: Got it! Where's the Obsidian vault?

Me: Let's set up a new vault

Macbook: Cool! Let's create a new vault.
```

In 10 minutes:
- Created `~/Documents/microblog-vault/`
- Created Next.js blog project
- Connected GitHub
- Deployed to Vercel

First deploy had an error:

```
Me: Application error: a client-side exception has occurred

Macbook: Oh right! Found the issue 💡
         The blog reads from local path, but Vercel server doesn't have that folder.
         Fixing it:
```

Then another error:

```
Me: Objects are not valid as React child

Macbook: (Fixes code to convert Date objects to strings)
         Try again
```

After 3 fixes, the blog was live.

Then I pasted this setup guide written in Claude.ai into Telegram, and Macbook automatically saved it as a markdown file and deployed.

**What you're reading right now is the result.**

```
Me: Add the process of us building this blog to the end of the post,
    make it meta and fun

Macbook: lol let's go meta 🔄
```

---

## Links

- [OpenClaw Official Docs](https://docs.openclaw.ai)
- [OpenClaw Security Guide](https://docs.openclaw.ai/gateway/security)
- [Tailscale Serve Docs](https://tailscale.com/kb/1242/tailscale-serve)
