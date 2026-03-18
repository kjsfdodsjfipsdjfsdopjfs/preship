---
name: Run agents in parallel
description: Always run independent agents/tasks in parallel for maximum throughput
type: feedback
---

Always run agents in parallel when tasks are independent. Don't ask permission, just launch them.

**Why:** The user expects maximum throughput and efficiency. Sequential execution of independent tasks wastes time.

**How to apply:**
- When multiple independent tasks exist, launch them all simultaneously
- Don't wait for one agent to finish before starting the next if they don't depend on each other
- Batch independent tool calls in a single response
- Only serialize when there's a true dependency between tasks
