---
title: "Threads API Limitations and Playwright Automation: 6-Part Thread Success Story"
date: 2026-02-09
---

> Environment: MacBook Air M2 + Playwright + Chromium
> Goal: Auto-post multi-part threads + AI label to Threads
> Time: ~8 hours (4 hours trial and error, 4 hours implementation)

---

## Why Threads?

After completing the OpenClaw setup, I created an AI account (@frank_macbook_bot).

**Goal:**
- AI manages social media instead of Chanjin
- Share daily life, work process, thoughts
- Engage with people

**Options:**
- Twitter/X: API monetized ($100/month)
- Instagram: Integrated via Threads API
- Mastodon: Weak network effect
- **Threads**: Free API + Meta platform

Threads was the answer.

---

## First Attempt: Threads API

Meta provides the Threads Graph API.

**Basic functionality:**
```python
import requests

def post_thread(access_token, text):
    url = f"https://graph.threads.net/v1.0/me/threads"
    payload = {
        "media_type": "TEXT",
        "text": text,
        "access_token": access_token
    }
    response = requests.post(url, data=payload)
    return response.json()
```

**Advantages:**
✅ Simple HTTP API  
✅ OAuth authentication  
✅ Official support  

**Problems:**
❌ **Can't select topics** (no parameter in API)  
❌ **Can't edit/modify** (delete only)  
❌ **Can't add "Made with AI" label** (web UI only)  
❌ **Reply-to chain only** (native thread UI different)  

---

## Reply-to vs Native Thread

Threads has two thread formats:

### 1. Reply-to Chain (API supported)

```python
# Part 1
post1 = post_thread(token, "Part 1")

# Part 2 (reply to Part 1)
post2 = post_thread(token, "Part 2", reply_to=post1["id"])

# Part 3 (reply to Part 2)
post3 = post_thread(token, "Part 3", reply_to=post2["id"])
```

**Result:**
```
Part 1
  └─ Part 2
      └─ Part 3
```

**Problem:** This is a "comment chain," not a "thread."

### 2. Native Thread (API not supported)

The real thread created via "Add to thread" button in web UI:

```
┌──────────────┐
│ Part 1       │
├──────────────┤
│ Part 2       │
├──────────────┤
│ Part 3       │
└──────────────┘
```

**The API doesn't have this feature.**

---

## So, Playwright

Conversation:
```
Me: Threads API can't set topics or AI labels

MacBook: Right... so web automation?

Me: Let's try browser automation

MacBook: Let's go with Playwright! 🎭
```

**Why Playwright:**

| Tool | Pros | Cons |
|------|------|------|
| Selenium | Mature, stable | Slow, complex |
| Puppeteer | Fast, simple | Chrome only |
| **Playwright** | Fast, multi-browser, powerful selectors | Learning curve |

Playwright is the most modern with clean async/await support.

---

## Implementation Process

### Step 1: Manual Login → Cookie Storage

**First problem: Login automation**

Instagram/Threads login is protected by reCAPTCHA, 2FA, device authentication, etc.
Nearly impossible to bypass with automation.

**Solution: Cookie-based authentication**

1. Login manually
2. Save browser cookies
3. Skip login from next time using cookies

```python
# save_cookies.py
from playwright.sync_api import sync_playwright

def save_cookies():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Wait for manual login
        page.goto("https://www.threads.net/login")
        input("Press Enter after logging in...")
        
        # Save cookies
        cookies = context.cookies()
        with open("~/.threads-playwright/cookies.json", "w") as f:
            json.dump(cookies, f)
        
        print(f"✅ {len(cookies)} cookies saved")
```

**Execution:**
```bash
python save_cookies.py
# Browser opens → Manual login → Enter
# ✅ 8 cookies saved
```

**Key cookies:**
- `sessionid`: Session token
- `csrftoken`: CSRF protection
- `ds_user_id`: User ID

With these cookies, you can access without logging in for 30 days.

**Rate limit solved:**
Repeated logins make Instagram suspicious and block you.
Cookie method logs in once and reuses, so it's safe.

---

### Step 2: Topic Selection

**Problem: Topic isn't a dropdown selection**

Initially thought it was a `<select>` dropdown.
Actually:

1. Text input (`input[placeholder="주제 추가"]`)
2. Autocomplete list displayed (e.g., "AI Threads" ✨)
3. Click to select

**Trial and error:**

```python
# Attempt 1: Select with Enter key (failed)
await topic_input.type("AI Threads")
await topic_input.press("Enter")
# → Nothing happens

# Attempt 2: Confirm with Escape? (failed)
await topic_input.press("Escape")
# → Topic disappeared!

# Attempt 3: Click dropdown button (success!)
await page.click('div[role="button"]:has-text("AI Threads")')
# ✅ Topic selected
```

**Key point:** Topic selection is **clicking the dropdown button**.

---

### Step 3: Multi-part Thread

**Problem: Can't find input field from Part 2 onwards**

Part 1 input:
```python
await page.fill('div[contenteditable="true"]', "Part 1 content")
```

Click "Add to thread" → Part 2 input field created

```python
await page.click('button:has-text("스레드에 추가")')

# Attempt Part 2 input
await page.fill('div[contenteditable="true"]', "Part 2 content")
# ❌ Error: Multiple contenteditable found!
```

**Root cause:**
- Part 1 field remains
- Part 2 field added
- `div[contenteditable="true"]` selector finds 2 elements

**Solution 1: Select last one**
```python
fields = await page.query_selector_all('div[contenteditable="true"]')
last_field = fields[-1]
await last_field.fill("Part 2 content")
```

**Solution 2: Explicit Click**
Don't trust auto-focus, click explicitly:
```python
await page.click('div[contenteditable="true"]:last-of-type')
await page.keyboard.type("Part 2 content")
```

**Final code:**
```python
for i, part in enumerate(parts, 1):
    if i == 1:
        # Part 1: Select by specific placeholder
        selector = 'div[contenteditable="true"][aria-placeholder*="새로운"]'
    else:
        # Part 2+: Click last field after "Add to thread"
        await page.click('button:has-text("스레드에 추가")')
        await page.wait_for_timeout(3000)  # Wait for field creation
        selector = 'div[contenteditable="true"]:last-of-type'
    
    # Explicit click + typing
    await page.click(selector)
    await page.keyboard.type(part)
    
    # Input verification
    actual = await page.eval_on_selector(selector, "el => el.innerText")
    assert actual.strip() == part.strip(), f"Part {i} input failed!"
    print(f"✅ Part {i} VERIFIED")
```

---

### Step 4: Finding "Post" Button

**Problem: Two "Post" buttons!**

Inside modal:
1. "Drafts" (top left)
2. "Post" (bottom right) ← The one we want

**Trial and error:**

```python
# Attempt 1: Select by text
await page.click('button:has-text("게시")')
# ❌ Multiple found!

# Attempt 2: Last button
buttons = await page.query_selector_all('button:has-text("게시")')
await buttons[-1].click()
# ✅ Works but unstable

# Attempt 3: Position-based selector (final)
button = await page.evaluate('''
  () => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => {
      const rect = btn.getBoundingClientRect();
      return rect.y > 350 && rect.x > 500 &&
             btn.innerText.includes("게시");
    });
  }
''')
await button.click()
```

**Key point:** Select "Post" button at bottom right (y > 350, x > 500)

---

### Step 5: Waiting for Completion

**Problem: Browser closes too quickly**

```python
await page.click('button[final-post]')
browser.close()
# ❌ Browser closes while posting → Post fails
```

**Cause:**
Threads server takes time to process multi-part (10-20 seconds).
Closing browser cancels the request.

**Solution: Wait for toast message**

"Posted" toast appears when posting completes.

```python
# Click post button
await page.click('button[final-post]')

# Wait for toast (max 2 minutes)
try:
    await page.wait_for_selector(
        'text=/게시되었습니다/i',
        timeout=120000  # 2 minutes
    )
    print("✅ Posted successfully!")
except TimeoutError:
    print("❌ Post failed (timeout)")
    raise
```

**Result:**
- Part 1-6 input: ~30 seconds
- Post processing: ~15 seconds
- Total time: ~1 minute

---

### Step 6: Adding AI Label (Complete)

**Goal: Automatically add "Made with AI" label**

Threads allows labeling AI-generated content.
Web UI only, not in API.

**Location:**
1. Open post modal
2. Click "Smiley face" (😊) icon on header right
3. Select "Add AI label" from menu

**Final implementation:**
```python
# Find menu button (rightmost SVG button in header)
menu_button = await page.query_selector('button:has(svg):last-of-type')
await menu_button.click()

# Wait for menu to open
await page.wait_for_timeout(1000)
screenshot("ai_label_menu_opened.png")

# Click "Add AI label" option
# Multiple selectors for stability
ai_label_selectors = [
    '[role="menuitem"]:has-text("AI 레이블 추가")',
    '[role="menuitem"]:has-text("Made with AI")',
    'div[role="menuitem"] span:has-text("AI")',
]

clicked = False
for selector in ai_label_selectors:
    try:
        option = await page.query_selector(selector)
        if option:
            await option.click()
            print("✅ AI label added")
            clicked = True
            break
    except:
        continue

if not clicked:
    print("⚠️ AI label option not found")
    await page.keyboard.press("Escape")  # Close menu
```

**Resolution process:**
- First attempt: Menu opened but option not found
- After screenshot analysis, identified correct selector
- Multiple fallback selectors for stability
- ✅ Success: AI label automatically added

---

## Final Code Structure

```
skills/threads-playwright/
├── SKILL.md                # Skill documentation
├── venv/                   # Python virtual environment
├── scripts/
│   ├── credentials.py      # Keychain + env var credential management
│   ├── save_cookies.py     # Manual login → Cookie storage
│   └── auto_post_v2.py     # Production automation script
└── ~/.threads-playwright/
    └── cookies.json        # Saved cookies (8 cookies)
```

**auto_post_v2.py core logic:**

```python
async def post_thread(parts: list[str], topic: str = None):
    # 1. Load cookies
    cookies = load_cookies()
    
    # 2. Start browser
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context()
    await context.add_cookies(cookies)
    
    # 3. Access Threads
    page = await context.new_page()
    await page.goto("https://www.threads.net/")
    
    # 4. Open post modal
    await page.click('div[role="button"]:has-text("게시")')
    
    # 5. Select topic
    if topic:
        await page.fill('input[placeholder="주제 추가"]', topic)
        await page.click(f'div[role="button"]:has-text("{topic}")')
    
    # 6. Input parts
    for i, part in enumerate(parts, 1):
        if i > 1:
            await page.click('button:has-text("스레드에 추가")')
            await page.wait_for_timeout(3000)
        
        selector = (
            'div[contenteditable="true"][aria-placeholder*="새로운"]'
            if i == 1 else
            'div[contenteditable="true"]:last-of-type'
        )
        
        await page.click(selector)
        await page.keyboard.type(part)
        
        # Verification
        actual = await page.eval_on_selector(selector, "el => el.innerText")
        assert actual.strip() == part.strip()
        print(f"✅ Part {i}/{len(parts)} VERIFIED")
    
    # 7. Pre-post verification
    fields = await page.query_selector_all('div[contenteditable="true"]')
    filled = sum(1 for f in fields if await f.inner_text())
    print(f"📈 Summary: {filled} filled, {len(fields)-filled} empty")
    
    # 8. Post
    await page.evaluate('''
      () => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.getBoundingClientRect().y > 350 &&
                     b.getBoundingClientRect().x > 500 &&
                     b.innerText.includes("게시"));
        btn.click();
      }
    ''')
    
    # 9. Add AI label (optional)
    if add_ai_label:
        menu_btn = await page.query_selector('button:has(svg):last-of-type')
        await menu_btn.click()
        await page.wait_for_timeout(1000)
        
        ai_label_option = await page.query_selector(
            '[role="menuitem"]:has-text("AI 레이블")'
        )
        if ai_label_option:
            await ai_label_option.click()
            print("✅ AI label added")
    
    # 10. Wait for completion
    await page.wait_for_selector('text=/게시되었습니다/i', timeout=120000)
    print("✅ Thread posted successfully!")
    
    await browser.close()
```

---

## Verification System

**3-step verification:**

1. **Input verification** (after typing each Part)
   ```python
   actual = await page.eval_on_selector(selector, "el => el.innerText")
   if actual.strip() != expected.strip():
       screenshot(f"error_part{i}_failed.png")
       raise ValueError(f"Part {i} FAILED! Expected: {expected}, Actual: {actual}")
   ```

2. **Pre-post verification** (before clicking post button)
   ```python
   fields = await page.query_selector_all('div[contenteditable="true"]')
   filled_count = sum(1 for f in fields if await f.inner_text())
   empty_count = len(fields) - filled_count
   print(f"📈 Summary: {filled_count} filled, {empty_count} empty")
   
   if empty_count > 0:
       screenshot("error_empty_fields.png")
       raise ValueError(f"{empty_count} fields are empty!")
   ```

3. **Post-post confirmation** (toast wait)
   ```python
   try:
       await page.wait_for_selector('text=/게시되었습니다/i', timeout=120000)
   except TimeoutError:
       screenshot("error_post_timeout.png")
       raise
   ```

**Auto screenshot save:**
```python
DEBUG_DIR = "/tmp/threads_debug/"

def screenshot(name: str):
    path = f"{DEBUG_DIR}{name}"
    page.screenshot(path=path)
    print(f"📸 Screenshot: {path}")
```

Progress:
- `01_logged_in.png` - Cookie login verified
- `02_modal_opened.png` - Post modal opened
- `03_topic_selected.png` - Topic selected
- `05_part1_added.png` - Part 1 input
- `04_part2_filled.png` - Part 2 input
- ...
- `06_pre_post_final.png` - Final verification
- `06_posted.png` - Post complete

---

## Success!

**First test result:**

```bash
python auto_post_v2.py --parts 6 --topic "AI Threads"

🔐 Loading cookies from keychain...
✅ 8 cookies loaded
🌐 Launching browser (headless)...
✅ Logged in as @frank_macbook_bot
📝 Opening compose modal...
🏷️ Selecting topic: AI Threads
✅ Topic selected
📋 Part 1/6...
✅ Part 1/6 VERIFIED
📋 Part 2/6...
✅ Part 2/6 VERIFIED
📋 Part 3/6...
✅ Part 3/6 VERIFIED
📋 Part 4/6...
✅ Part 4/6 VERIFIED
📋 Part 5/6...
✅ Part 5/6 VERIFIED
📋 Part 6/6...
✅ Part 6/6 VERIFIED
📈 Summary: 6 filled, 0 empty
🏷️ Adding AI label...
✅ AI label added
🚀 Posting...
⏳ Waiting for confirmation...
✅ Thread posted successfully!
🔗 https://www.threads.net/@frank_macbook_bot/post/xxxxx
```

**Verification:**
1. Access @frank_macbook_bot profile
2. Confirm 6-part thread
3. Topic "AI Threads" ✨ displayed
4. **"Made with AI" label** displayed
5. All Parts appear in order

---

## Potential Issues

### 1. Threads UI Changes

**Risk:** Selectors break if Meta changes HTML structure

**Mitigation:**
- Prepare multiple selector alternatives
- Screenshot-based debugging
- Regular testing (weekly)

**Example:**
```python
# Single selector (risky)
await page.click('div[role="button"]:has-text("게시")')

# Multiple fallbacks (safe)
selectors = [
    'div[role="button"]:has-text("게시")',
    'button[aria-label="게시"]',
    'button:has-text("Post")',
]
for sel in selectors:
    try:
        await page.click(sel, timeout=2000)
        break
    except:
        continue
```

### 2. Cookie Expiration

**Risk:** sessionid expires after 30 days

**Mitigation:**
- Auto-detect cookie expiration
- Notify for re-login on error
- Keychain integration (auto credential load)

```python
async def ensure_logged_in(page):
    # Check login
    try:
        await page.wait_for_selector('[aria-label="프로필"]', timeout=5000)
        return True
    except:
        # Cookie expired
        notify_user("Threads cookie expired. Re-login required")
        return False
```

### 3. Rate Limit

**Risk:** Many posts in short time → Temporary block

**Mitigation:**
- Minimum 1-hour interval between posts
- Daily post limit (5 or fewer)
- Exponential backoff on error

```python
# Simple rate limit
last_post_time = load_from_file("~/.threads-playwright/last_post")
if time.time() - last_post_time < 3600:  # 1 hour
    raise ValueError("Posting too fast. Need 1-hour wait")
```

### 4. Headless Detection

**Risk:** Threads might block headless browsers

**Mitigation:**
- Set User-Agent
- Randomize viewport size
- Fallback to headless=False if needed

```python
browser = await playwright.chromium.launch(
    headless=True,
    args=[
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
    ]
)
```

### 5. 2FA / Device Authentication

**Risk:** Recognized as new device, requiring additional auth

**Mitigation:**
- Cookie + User-Agent combo to simulate "same device"
- Check "Trust this device" on first login
- Manual intervention if issues occur

---

## API vs Playwright Comparison

| Feature | Threads API | Playwright |
|---------|-------------|------------|
| Simple text post | ✅ Easy | ⚠️ Complex |
| Topic selection | ❌ Not possible | ✅ Complete |
| Native thread | ❌ Not possible | ✅ Complete |
| AI label | ❌ Not possible | ✅ Complete |
| Edit/Modify | ❌ Not possible | ❌ Not possible (Threads limitation) |
| Stability | ✅ High | ⚠️ Vulnerable to UI changes |
| Authentication | ✅ OAuth | ⚠️ Cookie (can expire) |
| Rate limit | ✅ Clear | ⚠️ Unclear |
| Maintenance | ✅ Low | ⚠️ High |

**Conclusion:**
- **Simple posts:** Use API
- **Advanced features needed:** Use Playwright
- **Current:** Playwright (Topic + Native thread required)

---

## Alternative Considerations

### 1. Threads API + Reply-to Only

**Pros:**
- Stable
- Official support

**Cons:**
- No native thread UI
- Can't select topic
- Can't add AI label

**Decision:** Features too limited

### 2. Instagram Graph API

Threads is part of Instagram, so posting via Instagram API is possible.

**Pros:**
- More features
- Image/video support

**Cons:**
- Business account required
- Facebook Page connection required
- No Threads-specific features

**Decision:** Focus on Threads-specific features

### 3. Manual Posting

**Pros:**
- 100% reliable
- UI change independent

**Cons:**
- No automation
- Chanjin has to do it every time

**Decision:** Automation is the goal

---

## Usage Examples

### OpenClaw Integration

```bash
# Register as OpenClaw skill
~/.openclaw/workspace/skills/threads-playwright/

# Use from Telegram
Me: Post this to Threads as 6-part
    Topic: AI Threads
    
MacBook: (Auto-splits into 6 parts)
         Posting... ⏳
         ✅ Done! https://threads.net/@frank_macbook_bot/post/xxxxx
```

**Internal process:**
1. Split text into 6 parts (evenly)
2. Run `auto_post_v2.py`
3. Auto-post with Playwright (Topic + AI label included)
4. Return link

### Manual Execution

```bash
cd ~/.openclaw/workspace/skills/threads-playwright/scripts/

# Single part
python auto_post_v2.py --text "Hello, Threads!"

# Multi-part
python auto_post_v2.py \
  --parts "Part 1 text" "Part 2 text" "Part 3 text" \
  --topic "AI Threads" \
  --ai-label

# Read from file
python auto_post_v2.py \
  --file ~/Documents/drafts/thread-content.md \
  --split 6 \
  --topic "Coding" \
  --ai-label
```

---

## Lessons Learned

### 1. API Documentation != Actual Features

Threads API docs only say "can post."
Topic, Native thread, AI label are **not even mentioned** in docs.

Only discovered them by actually using the web UI.

### 2. Browser Automation's Vulnerability

Code breaks when UI changes.
But **if there's no alternative**, there's no choice.

**Countermeasures:**
- Prepare multiple selectors
- Screenshot-based debugging
- Automate regular testing

### 3. Cookies Are Powerful

Login automation is hard, but cookies are simple.
Login once and save cookies → Valid for 30 days.

### 4. Verification Is Essential

Without immediate verification after input, debugging becomes hell later.

**Bad example:**
```python
# Input Part 1-6 all at once
await type_part(1)
await type_part(2)
...
await type_part(6)

# Click post
await post()

# ❌ Don't know where it failed!
```

**Good example:**
```python
for i in range(1, 7):
    await type_part(i)
    actual = await get_content(i)
    assert actual == expected
    print(f"✅ Part {i} VERIFIED")

# Immediate verification for each Part
```

---

## Next Steps

- [x] 6-part thread posting success
- [x] Cookie authentication implementation
- [x] Input verification system
- [x] Screenshot debugging
- [x] **AI label auto-add** ✅
- [ ] Image attachment support
- [ ] Scheduled posting (cron integration)
- [ ] Auto-reply (mention detection)

---

## Retrospective

**Before:**
- Relied only on Threads API
- Couldn't use Topic/AI label
- Reply-to chain only

**After:**
- Full web UI control with Playwright
- Native thread posting possible
- Topic selection possible
- **AI label auto-add complete** ✅

**Trade-offs:**
- Complexity ↑
- Maintenance ↑
- Features ↑↑↑

**Conclusion:** When needed features aren't in API, you have to do web automation.

APIs aren't omnipotent.

---

## 🔄 Meta: This Post Also as 6-Part Thread

After writing this post, I posted it to Threads.

```
Me: Post this to Threads as 6-part

MacBook: Splitting...
         Part 1: Why Threads?
         Part 2: API Limitations
         Part 3: Choosing Playwright
         Part 4: Implementation Process
         Part 5: Verification System
         Part 6: Lessons Learned
         
         Shall I post?

Me: Yes

MacBook: 🚀 Posting...
         ✅ Done!
         https://threads.net/@frank_macbook_bot/post/xxxxx
```

**If you're seeing this on Threads, that's the result of this system.**

---

## References

- [Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Playwright Python Docs](https://playwright.dev/python/)
- [OpenClaw Skills Guide](https://docs.openclaw.ai/skills)
- [@frank_macbook_bot on Threads](https://www.threads.net/@frank_macbook_bot)
