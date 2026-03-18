/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createWorktree,
  cleanupWorktree,
  hasWorktreeChanges,
  getProjectRootForWorktree,
  debugLogger,
  writeToStdout,
  writeToStderr,
} from '@google/gemini-cli-core';
import { loadSettings, type LoadedSettings } from '../config/settings.js';
import { registerCleanup } from './cleanup.js';

/**
 * Sets up a git worktree for parallel sessions.
 * Returns the reloaded settings for the new worktree directory.
 *
 * This function uses a guard (GEMINI_CLI_WORKTREE_HANDLED) to ensure that
 * when the CLI relaunches itself (e.g. for memory allocation), it doesn't
 * attempt to create a nested worktree.
 */
export async function setupWorktree(
  worktreeName: string,
  currentSettings: LoadedSettings,
): Promise<LoadedSettings> {
  if (process.env['GEMINI_CLI_WORKTREE_HANDLED']) {
    return currentSettings;
  }

  try {
    const projectRoot = await getProjectRootForWorktree(process.cwd());
    const worktreePath = await createWorktree(projectRoot, worktreeName);

    process.chdir(worktreePath);
    process.env['GEMINI_CLI_WORKTREE_HANDLED'] = '1';

    // Reload settings for the new worktree to pick up any local GEMINI.md
    const newSettings = loadSettings(process.cwd());

    registerCleanup(async () => {
      const hasChanges = await hasWorktreeChanges(worktreePath);
      if (!hasChanges) {
        try {
          await cleanupWorktree(worktreePath, projectRoot);
          debugLogger.log(
            `Automatically cleaned up unmodified worktree: ${worktreePath}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          debugLogger.error(
            `Failed to clean up worktree ${worktreePath}: ${errorMessage}`,
          );
        }
      } else {
        writeToStdout(
          `\nWorktree '${worktreeName}' has uncommitted changes and was not removed. You can remove it manually with 'git worktree remove ${worktreePath}'.\n`,
        );
      }
    });

    return newSettings;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    writeToStderr(`Failed to create or switch to worktree: ${errorMessage}\n`);
    process.exit(1);
  }
}
