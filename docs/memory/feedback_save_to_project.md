---
name: Save memory to project folder
description: Always save memory files to docs/memory/ inside the project, not just .claude hidden folder
type: feedback
---

Always save memory files to `docs/memory/` inside the project folder (`shipcheck/docs/memory/`), not just the hidden `.claude/` folder.

**Why:** Rodrigo can't easily access files in `.claude/projects/...` from the terminal. The project folder is where he looks for everything.

**How to apply:**
- When writing/updating memory files, write to BOTH locations:
  1. `/Users/rodrigoreis/.claude/projects/-Users-rodrigoreis-Desktop-claude/memory/` (Claude Code reads from here)
  2. `/Users/rodrigoreis/Desktop/claude/shipcheck/docs/memory/` (Rodrigo reads from here)
- After updating memory in .claude, always copy to docs/memory/
