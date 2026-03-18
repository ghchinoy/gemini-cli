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

export async function setupWorktree(
  worktreeName: string,
): Promise<LoadedSettings> {
  try {
    const projectRoot = await getProjectRootForWorktree(process.cwd());
    const worktreePath = await createWorktree(projectRoot, worktreeName);
    process.chdir(worktreePath);

    // Strip --worktree so that if we relaunch, the child process doesn't recreate it
    const wIndex = process.argv.findIndex(
      (a) => a === '--worktree' || a === '-w',
    );
    if (wIndex !== -1) {
      if (
        process.argv.length > wIndex + 1 &&
        !process.argv[wIndex + 1].startsWith('-')
      ) {
        process.argv.splice(wIndex, 2);
      } else {
        process.argv.splice(wIndex, 1);
      }
    }
    const eqIndex = process.argv.findIndex(
      (a) => a.startsWith('--worktree=') || a.startsWith('-w='),
    );
    if (eqIndex !== -1) {
      process.argv.splice(eqIndex, 1);
    }

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
