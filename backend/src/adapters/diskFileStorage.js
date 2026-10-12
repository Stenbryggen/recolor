import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// FileStorage that keeps the files in a folder on disk, e.g. backend/uploads/ticket-1/front.jpg.
export function createDiskFileStorage(rootDir) {
  const root = path.resolve(rootDir);

  // Turns a key into a path inside the root folder, and refuses keys that point outside it.
  function pathFor(key) {
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error(`Invalid file key: ${key}`);
    return full;
  }

  return {
    async save(key, buffer) {
      const full = pathFor(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, buffer);
    },

    async read(key) {
      try {
        return await readFile(pathFor(key));
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    },

    async delete(key) {
      await rm(pathFor(key), { force: true });
    },
  };
}
