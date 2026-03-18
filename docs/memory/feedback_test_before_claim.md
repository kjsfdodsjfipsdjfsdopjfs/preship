---
name: Test before claiming done
description: Never claim something works without actually testing it end-to-end in browser
type: feedback
---

Never claim functionality works without actually testing it. Open the real production URL, click through the flow, verify with screenshots.

**Why:** Rodrigo caught that the dashboard was broken, signup was broken, scoring was wrong — all while I was claiming things were "done". Multiple agents modified code but nobody tested the final result in production.

**How to apply:**
- After deploying, always open preship.dev in browser and test the full flow
- After any agent modifies code, verify the build succeeds AND the feature works
- Use preview_screenshot / browser automation to prove things work
- Never say "concluído" without evidence
- Test on real sites, not just example.com
