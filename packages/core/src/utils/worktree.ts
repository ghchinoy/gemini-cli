/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import { execa } from 'execa';

export async function getProjectRootForWorktree(cwd: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--show-toplevel'], {
      cwd,
    });
    const gitRoot = path.normalize(stdout.trim());

    const worktreesPath = path.join('.gemini', 'worktrees');
    const index = gitRoot.indexOf(worktreesPath);

    if (index !== -1) {
      // Strip everything from .gemini/worktrees onwards
      return gitRoot.slice(0, Math.max(0, index - 1));
    }

    return gitRoot;
  } catch (_e) {
    return cwd;
  }
}

export function getWorktreePath(projectRoot: string, name: string): string {
  return path.join(projectRoot, '.gemini', 'worktrees', name);
}

export async function createWorktree(
  projectRoot: string,
  name: string,
): Promise<string> {
  const worktreePath = getWorktreePath(projectRoot, name);
  const branchName = `worktree-${name}`;

  await execa('git', ['worktree', 'add', worktreePath, '-b', branchName], {
    cwd: projectRoot,
  });

  return worktreePath;
}

export function isGeminiWorktree(
  dirPath: string,
  projectRoot: string,
): boolean {
  const worktreesBaseDir = path.join(projectRoot, '.gemini', 'worktrees');
  return dirPath.startsWith(worktreesBaseDir);
}

export async function hasWorktreeChanges(dirPath: string): Promise<boolean> {
  const { stdout } = await execa('git', ['status', '--porcelain'], {
    cwd: dirPath,
  });
  return stdout.trim() !== '';
}

export async function cleanupWorktree(
  dirPath: string,
  projectRoot: string,
): Promise<void> {
  // Extract name from dirPath to know which branch to delete
  const name = path.basename(dirPath);
  const branchName = `worktree-${name}`;

  try {
    await execa('git', ['worktree', 'remove', dirPath, '--force'], {
      cwd: projectRoot,
    });
  } finally {
    try {
      await execa('git', ['branch', '-D', branchName], {
        cwd: projectRoot,
      });
    } catch {
      // Ignore errors when deleting branch as it might not exist
    }
  }
}
