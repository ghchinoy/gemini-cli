/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupWorktree } from './worktreeSetup.js';
import * as coreFunctions from '@google/gemini-cli-core';
import * as settingsFunctions from '../config/settings.js';
import * as cleanupFunctions from './cleanup.js';

// Mock dependencies
vi.mock('@google/gemini-cli-core', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@google/gemini-cli-core')>();
  return {
    ...actual,
    createWorktree: vi.fn(),
    cleanupWorktree: vi.fn(),
    hasWorktreeChanges: vi.fn(),
    getProjectRootForWorktree: vi.fn(),
    debugLogger: {
      log: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    writeToStdout: vi.fn(),
    writeToStderr: vi.fn(),
  };
});

vi.mock('../config/settings.js', () => ({
  loadSettings: vi.fn(),
}));

vi.mock('./cleanup.js', () => ({
  registerCleanup: vi.fn(),
}));

describe('setupWorktree', () => {
  const originalArgv = [...process.argv];
  const originalCwd = process.cwd;

  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = [...originalArgv];

    // Mock process.cwd and process.chdir
    process.cwd = vi.fn().mockReturnValue('/mock/project');
    process.chdir = vi.fn();

    // Mock successful execution of core utilities
    vi.mocked(coreFunctions.getProjectRootForWorktree).mockResolvedValue(
      '/mock/project',
    );
    vi.mocked(coreFunctions.createWorktree).mockResolvedValue(
      '/mock/project/.gemini/worktrees/my-feature',
    );
    vi.mocked(settingsFunctions.loadSettings).mockReturnValue({
      merged: {},
    } as never);
  });

  afterEach(() => {
    process.argv = [...originalArgv];
    process.cwd = originalCwd;
    // Restore chdir is trickier, we mocked it on process directly
    delete (process as { chdir?: typeof process.chdir }).chdir;
    // In node, process.chdir is a function. The spy will be cleared by clearAllMocks if it was a spy.
    // Since we assigned it, we need to be careful, but vi.fn() can just be replaced.
  });

  it('should create and switch to a new worktree', async () => {
    process.argv = ['node', 'gemini', '--worktree', 'my-feature'];

    await setupWorktree('my-feature');

    expect(coreFunctions.getProjectRootForWorktree).toHaveBeenCalledWith(
      '/mock/project',
    );
    expect(coreFunctions.createWorktree).toHaveBeenCalledWith(
      '/mock/project',
      'my-feature',
    );
    expect(process.chdir).toHaveBeenCalledWith(
      '/mock/project/.gemini/worktrees/my-feature',
    );
    expect(settingsFunctions.loadSettings).toHaveBeenCalledWith(
      '/mock/project',
    );
    expect(cleanupFunctions.registerCleanup).toHaveBeenCalled();
  });

  it('should strip --worktree flag and its value from process.argv', async () => {
    process.argv = [
      'node',
      'gemini',
      '--worktree',
      'my-feature',
      '--prompt',
      'hello',
    ];

    await setupWorktree('my-feature');

    expect(process.argv).toEqual(['node', 'gemini', '--prompt', 'hello']);
  });

  it('should strip --worktree flag when placed at the end', async () => {
    process.argv = [
      'node',
      'gemini',
      '--prompt',
      'hello',
      '--worktree',
      'my-feature',
    ];

    await setupWorktree('my-feature');

    expect(process.argv).toEqual(['node', 'gemini', '--prompt', 'hello']);
  });

  it('should strip -w alias from process.argv', async () => {
    process.argv = ['node', 'gemini', '-w', 'my-feature', '--prompt', 'hello'];

    await setupWorktree('my-feature');

    expect(process.argv).toEqual(['node', 'gemini', '--prompt', 'hello']);
  });

  it('should strip --worktree=name format from process.argv', async () => {
    process.argv = [
      'node',
      'gemini',
      '--worktree=my-feature',
      '--prompt',
      'hello',
    ];

    await setupWorktree('my-feature');

    expect(process.argv).toEqual(['node', 'gemini', '--prompt', 'hello']);
  });

  it('should strip -w=name format from process.argv', async () => {
    process.argv = ['node', 'gemini', '-w=my-feature', '--prompt', 'hello'];

    await setupWorktree('my-feature');

    expect(process.argv).toEqual(['node', 'gemini', '--prompt', 'hello']);
  });

  it('should strip --worktree flag without value', async () => {
    process.argv = ['node', 'gemini', '--worktree', '--prompt', 'hello'];

    await setupWorktree('some-random-name');

    expect(process.argv).toEqual(['node', 'gemini', '--prompt', 'hello']);
  });

  it('should handle errors gracefully and exit', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('PROCESS_EXIT');
    });

    vi.mocked(coreFunctions.createWorktree).mockRejectedValue(
      new Error('Git failure'),
    );

    await expect(setupWorktree('my-feature')).rejects.toThrow('PROCESS_EXIT');

    expect(coreFunctions.writeToStderr).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to create or switch to worktree: Git failure',
      ),
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });
});
