---
"ultracite": patch
---

Replace the hand-rolled child-process handling in the agent fix runner with execa. The timeout → SIGTERM → grace period → SIGKILL escalation, stderr capture, and spawn-failure handling now use execa's `timeout` and `forceKillAfterDelay` options, which are battle-tested across platforms (including Windows kill semantics the manual implementation didn't cover). Behavior is unchanged: agent runs still time out after 5 minutes, escalate to SIGKILL after a 10-second grace period, and report a capped stderr tail.
