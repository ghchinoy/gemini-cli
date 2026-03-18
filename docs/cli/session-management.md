# Session management

Session management saves your conversation history so you can resume your work
where you left off. Use these features to review past interactions, manage
history across different projects, and configure how long data is retained.

## Automatic saving

Your session history is recorded automatically as you interact with the model.
This background process ensures your work is preserved even if you interrupt a
session.

- **What is saved:** The complete conversation history, including:
  - Your prompts and the model's responses.
  - All tool executions (inputs and outputs).
  - Token usage statistics (input, output, cached, etc.).
  - Assistant thoughts and reasoning summaries (when available).
- **Location:** Sessions are stored in `~/.gemini/tmp/<project_hash>/chats/`,
  where `<project_hash>` is a unique identifier based on your project's root
  directory.
- **Scope:** Sessions are project-specific. Switching directories to a different
  project switches to that project's session history.

## Resuming sessions

You can resume a previous session to continue the conversation with all prior
context restored. Resuming is supported both through command-line flags and an
interactive browser.

### From the command line

When starting Gemini CLI, use the `--resume` (or `-r`) flag to load existing
sessions.

- **Resume latest:**

  ```bash
  gemini --resume
  ```

  This immediately loads the most recent session.

- **Resume by index:** List available sessions first (see
  [Listing sessions](#listing-sessions)), then use the index number:

  ```bash
  gemini --resume 1
  ```

- **Resume by ID:** You can also provide the full session UUID:
  ```bash
  gemini --resume a1b2c3d4-e5f6-7890-abcd-ef1234567890
  ```

### From the interactive interface

While the CLI is running, use the `/resume` slash command to open the **Session
Browser**:

```text
/resume
```

When typing `/resume` (or `/chat`) in slash completion, commands are grouped
under titled separators:

- `-- auto --` (session browser)
  - `list` is selectable and opens the session browser
- `-- checkpoints --` (manual tagged checkpoint commands)

Unique prefixes such as `/resum` and `/cha` resolve to the same grouped menu.

The Session Browser provides an interactive interface where you can perform the
following actions:

- **Browse:** Scroll through a list of your past sessions.
- **Preview:** See details like the session date, message count, and the first
  user prompt.
- **Search:** Press `/` to enter search mode, then type to filter sessions by ID
  or content.
- **Select:** Press **Enter** to resume the selected session.
- **Esc:** Press **Esc** to exit the Session Browser.

### Manual chat checkpoints

For named branch points inside a session, use chat checkpoints:

```text
/resume save decision-point
/resume list
/resume resume decision-point
```

Compatibility aliases:

- `/chat ...` works for the same commands.
- `/resume checkpoints ...` also remains supported during migration.

## Parallel sessions with Git worktrees

When working on multiple tasks at once, you need each Gemini session to have its
own copy of the codebase so changes don't collide. Git worktrees solve this by
creating separate working directories that each have their own files and branch,
while sharing the same repository history.

> **Note:** This is an experimental feature. To use it, you must enable it in
> your settings:
>
> ```json
> {
>   "experimental": {
>     "worktrees": true
>   }
> }
> ```

Use the `--worktree` (`-w`) flag to create an isolated worktree and start Gemini
CLI in it. The value you pass becomes the worktree directory name and branch
name:

```bash
# Start Gemini in a worktree named "feature-auth"
# Creates .gemini/worktrees/feature-auth/ with a new branch
gemini --worktree feature-auth

# Start another session in a separate worktree
gemini --worktree bugfix-123
```

If you omit the name, Gemini generates a random one automatically:

```bash
gemini --worktree
```

Worktrees are created at `<projectRoot>/.gemini/worktrees/<name>`. The worktree
branch is named `worktree-<name>`.

> **Note:** Remember to initialize your development environment in each new
> worktree according to your project's setup. Depending on your stack, this
> might include running dependency installation (`npm install`, `yarn`), setting
> up virtual environments, or following your project's standard build process.

### Worktree cleanup

When you exit a worktree session, Gemini handles cleanup based on whether you
made changes:

- **No changes:** The worktree and its branch are removed automatically.
- **Changes exist:** Gemini leaves the worktree intact and prints a message with
  instructions on how to manually remove it. It does not display an interactive
  prompt, ensuring your uncommitted work is safely preserved by default.

### Managing worktrees manually

For more control over worktree location and branch configuration, or to clean up
a preserved worktree, you can use Git directly:

```bash
# Clean up a preserved worktree
git worktree remove .gemini/worktrees/my-feature --force
git branch -D worktree-my-feature

# Create a worktree manually
git worktree add ../project-feature-a -b feature-a
cd ../project-feature-a && gemini
```

Learn more in the
[official Git worktree documentation](https://git-scm.com/docs/git-worktree).

## Managing sessions

You can list and delete sessions to keep your history organized and manage disk
space.

### Listing sessions

To see a list of all available sessions for the current project from the command
line, use the `--list-sessions` flag:

```bash
gemini --list-sessions
```

Output example:

```text
Available sessions for this project (3):

  1. Fix bug in auth (2 days ago) [a1b2c3d4]
  2. Refactor database schema (5 hours ago) [e5f67890]
  3. Update documentation (Just now) [abcd1234]
```

### Deleting sessions

You can remove old or unwanted sessions to free up space or declutter your
history.

**From the command line:** Use the `--delete-session` flag with an index or ID:

```bash
gemini --delete-session 2
```

**From the Session Browser:**

1.  Open the browser with `/resume`.
2.  Navigate to the session you want to remove.
3.  Press **x**.

## Configuration

You can configure how Gemini CLI manages your session history in your
`settings.json` file. These settings let you control retention policies and
session lengths.

### Session retention

By default, Gemini CLI automatically cleans up old session data to prevent your
history from growing indefinitely. When a session is deleted, Gemini CLI also
removes all associated data, including implementation plans, task trackers, tool
outputs, and activity logs.

The default policy is to **retain sessions for 30 days**.

#### Configuration

You can customize these policies using the `/settings` command or by manually
editing your `settings.json` file:

```json
{
  "general": {
    "sessionRetention": {
      "enabled": true,
      "maxAge": "30d",
      "maxCount": 50
    }
  }
}
```

- **`enabled`**: (boolean) Master switch for session cleanup. Defaults to
  `true`.
- **`maxAge`**: (string) Duration to keep sessions (for example, "24h", "7d",
  "4w"). Sessions older than this are deleted. Defaults to `"30d"`.
- **`maxCount`**: (number) Maximum number of sessions to retain. The oldest
  sessions exceeding this count are deleted. Defaults to undefined (unlimited).
- **`minRetention`**: (string) Minimum retention period (safety limit). Defaults
  to `"1d"`. Sessions newer than this period are never deleted by automatic
  cleanup.

### Session limits

You can limit the length of individual sessions to prevent context windows from
becoming too large and expensive.

```json
{
  "model": {
    "maxSessionTurns": 100
  }
}
```

- **`maxSessionTurns`**: (number) The maximum number of turns (user and model
  exchanges) allowed in a single session. Set to `-1` for unlimited (default).

  **Behavior when limit is reached:**
  - **Interactive mode:** The CLI shows an informational message and stops
    sending requests to the model. You must manually start a new session.
  - **Non-interactive mode:** The CLI exits with an error.

## Next steps

- Explore the [Memory tool](../tools/memory.md) to save persistent information
  across sessions.
- Learn how to [Checkpoint](./checkpointing.md) your session state.
- Check out the [CLI reference](./cli-reference.md) for all command-line flags.
