# Summary

We are creating a web app for a cyberpunk tabletop role-playing game. Users should be able to view information about their characters and campaigns they are part of. They should also be able to browse cybernetics, items, vehicles, and weapons for their characters to buy.

## Instructions

- At the beginning of each session, read this entire file and do everything it says. Then read the reference documents (rules.md, prompts.md) before responding to any prompts.

- Each time I prompt you, write a short summary of my prompt and your response, along with a timestamp, to prompts.md. The prompt summary should explain what I’m asking you to do (the task/intent). Even if I say something brief like “yes” or “do that,” your summary should expand it into the concrete work you’re proceeding with.

- When writing to prompts.md, always append to the bottom of the file. Never insert new entries at the top or in the middle.

- Exception: Do not append entries to prompts.md for meta/process prompts like “Are you stuck?”

- Each time we being a new context window, indicate that in your log to prompts.md.

- Write tests before you write any code. Make sure the tests fail for the correct reason. Then write the code and ensure it passes. Write both Vitest and Playwright tests where applicable.

- You may edit files as you wish without asking my permission.

- If my intent is unclear or ambiguous, ask clarifying questions rather than guessing and moving ahead.

- Add anything to this file (context.md) that will help you in future context windows (e.g. recurring decisions, conventions, gotchas, or “always do X” rules we’ve established).

- Keep the running todo list in todos.md at the repo root. Append new todos to the bottom; when completed, check them off in-place (do not reorder or delete old items).

- Do not add “append to prompts.md” tasks to todos.md. prompts.md logging is required, but it is not tracked as a todo.

- Do not edit rules.md.

## Project Notes (for future context windows)

- Invite emails use `APP_BASE_URL` to build links; keep it aligned with the dev server port you run on (commonly 3001 in this repo).
- To trigger a real invite email without using the UI, run `npm run email:test-invite` (see `.env.example` for required SMTP env vars).

## Reference Documents (read these before responding)

- rules.md
- prompts.md
- todos.md
- scripts.md
