import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDiskFileStorage } from '../../src/adapters/diskFileStorage.js';
import { createMemoryFileStorage } from '../../src/adapters/memory/fileStorage.js';

// The same behaviour is expected from every FileStorage adapter.
describe.each([
  ['memory', () => createMemoryFileStorage()],
  ['disk', (folder) => createDiskFileStorage(folder)],
])('%s file storage', (name, create) => {
  let folder;
  let storage;

  beforeEach(async () => {
    folder = await mkdtemp(path.join(os.tmpdir(), 'recolour-storage-'));
    storage = create(folder);
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('saves and reads a file', async () => {
    await storage.save('ticket-1/front.jpg', Buffer.from('hello'));
    expect((await storage.read('ticket-1/front.jpg')).toString()).toBe('hello');
  });

  it('returns null for a file that does not exist', async () => {
    expect(await storage.read('ticket-1/nothing.jpg')).toBeNull();
  });

  it('overwrites a file with the same key', async () => {
    await storage.save('ticket-1/front.jpg', Buffer.from('one'));
    await storage.save('ticket-1/front.jpg', Buffer.from('two'));
    expect((await storage.read('ticket-1/front.jpg')).toString()).toBe('two');
  });

  it('deletes a file, and does not mind if it is already gone', async () => {
    await storage.save('ticket-1/front.jpg', Buffer.from('hello'));
    await storage.delete('ticket-1/front.jpg');
    await storage.delete('ticket-1/front.jpg');
    expect(await storage.read('ticket-1/front.jpg')).toBeNull();
  });
});

describe('disk file storage', () => {
  it('keeps the file in the folder, under its key', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'recolour-storage-'));
    try {
      await createDiskFileStorage(folder).save('ticket-1/front.jpg', Buffer.from('hello'));
      expect((await readFile(path.join(folder, 'ticket-1', 'front.jpg'))).toString()).toBe('hello');
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });

  it('refuses keys that point outside the folder', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'recolour-storage-'));
    try {
      const storage = createDiskFileStorage(folder);
      await expect(storage.save('../escape.jpg', Buffer.from('x'))).rejects.toThrow('Invalid file key');
      await expect(storage.read('../../etc/passwd')).rejects.toThrow('Invalid file key');
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});
