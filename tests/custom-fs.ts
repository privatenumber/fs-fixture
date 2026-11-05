import os from 'node:os';
import path from 'node:path';
import { describe, test, expect } from 'manten';
import { create, MemoryProvider } from '@platformatic/vfs';
import { memfs } from 'memfs';
import { createFixture, type FsPromises } from '#fs-fixture';
import type * as fsFixtureModule from '#fs-fixture';

type FsFixtureModule = typeof fsFixtureModule;

describe('custom fs (BYOFS)', () => {
	test('creates from FileTree', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'file.txt': 'hello',
			'dir/nested.txt': 'nested',
		}, { fs });

		expect(await fixture.readFile('file.txt', 'utf8')).toBe('hello');
		expect(await fixture.readFile('dir/nested.txt', 'utf8')).toBe('nested');
		expect(await fixture.exists('file.txt')).toBe(true);
		expect(await fixture.exists('missing.txt')).toBe(false);
	});

	test('creates empty fixture', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture(undefined, { fs });

		expect(await fixture.exists()).toBe(true);
	});

	// memfs mkdtemp() requires the parent directory to exist, like node:fs
	test('creates fixture in memfs without tempDir', async () => {
		// A fresh memfs only contains the root, so the parent is missing unless it is the root
		expect(os.tmpdir()).not.toBe(path.parse(os.tmpdir()).root);

		const { fs } = memfs();
		await using fixture = await createFixture({
			'file.txt': 'hello',
		}, { fs: fs.promises as FsPromises });

		expect(await fixture.readFile('file.txt', 'utf8')).toBe('hello');
	});

	test('creates from initializer', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture(async (fixture) => {
			await fixture.mkdir('initialized');

			return {
				'initialized/file.txt': fixture.path,
			};
		}, { fs });

		expect(await fs.readFile(fixture.getPath('initialized/file.txt'), 'utf8')).toBe(fixture.path);
	});

	test('preserves initializer error when cleanup throws synchronously', async () => {
		const memoryFs = create(new MemoryProvider()).promises;
		const {
			unlink: _unlink,
			rmdir: _rmdir,
			...fs
		} = memoryFs;
		const initializerError = new Error('Initializer failed');
		let fixturePath = '';

		try {
			await expect(createFixture((fixture) => {
				fixturePath = fixture.path;
				throw initializerError;
			}, { fs })).rejects.toBe(initializerError);
		} finally {
			await memoryFs.rmdir(fixturePath);
		}
	});

	test('waits for FileTree writes before cleanup', async () => {
		const memoryFs = create(new MemoryProvider()).promises;
		const delayedWrite = Promise.withResolvers<void>();
		const writeError = new Error('Write failed');
		let cleanupStarted = false;
		let fixturePath = '';

		const fs = {
			...memoryFs,
			writeFile: async (...args: Parameters<typeof memoryFs.writeFile>) => {
				if (String(args[0]).endsWith('fails.txt')) {
					throw writeError;
				}

				await delayedWrite.promise;
				return memoryFs.writeFile(...args);
			},
			rmdir: async (...args: Parameters<typeof memoryFs.rmdir>) => {
				cleanupStarted = true;
				return memoryFs.rmdir(...args);
			},
		};

		const fixtureResult = createFixture((fixture) => {
			fixturePath = fixture.path;

			return {
				'fails.txt': 'fails',
				'pending.txt': 'pending',
			};
		}, { fs }).then(
			() => new Error('Expected fixture creation to fail'),
			error => error,
		);

		await new Promise(setImmediate);
		expect(cleanupStarted).toBe(false);

		delayedWrite.resolve();

		expect(await fixtureResult).toBe(writeError);
		expect(cleanupStarted).toBe(true);
		await expect(memoryFs.access(fixturePath)).rejects.toThrow();
	});

	test('aggregates FileTree write failures', async () => {
		const memoryFs = create(new MemoryProvider()).promises;
		const firstError = new Error('First write failed');
		const secondError = new Error('Second write failed');
		let fixturePath = '';

		const fs = {
			...memoryFs,
			writeFile: async (...args: Parameters<typeof memoryFs.writeFile>) => {
				if (String(args[0]).endsWith('first.txt')) {
					throw firstError;
				}

				if (String(args[0]).endsWith('second.txt')) {
					throw secondError;
				}

				return memoryFs.writeFile(...args);
			},
		};

		const error = await createFixture((fixture) => {
			fixturePath = fixture.path;

			return {
				'first.txt': 'first',
				'second.txt': 'second',
			};
		}, { fs }).then(
			() => new Error('Expected fixture creation to fail'),
			rejectionError => rejectionError,
		);

		expect(error).toBeInstanceOf(AggregateError);
		expect((error as AggregateError).errors).toStrictEqual([firstError, secondError]);
		await expect(memoryFs.access(fixturePath)).rejects.toThrow();
	});

	test('supports readdir', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'a.txt': 'a',
			'b.txt': 'b',
			dir: { 'c.txt': 'c' },
		}, { fs });

		const entries = await fixture.readdir('');
		expect(entries).toContain('a.txt');
		expect(entries).toContain('b.txt');
		expect(entries).toContain('dir');
	});

	test('supports writeFile and readFile', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture(undefined, { fs });

		await fixture.writeFile('new.txt', 'created');
		expect(await fixture.readFile('new.txt', 'utf8')).toBe('created');
	});

	test('supports JSON operations', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture(undefined, { fs });

		await fixture.writeJson('config.json', { port: 3000 });
		const config = await fixture.readJson<{ port: number }>('config.json');
		expect(config.port).toBe(3000);
	});

	test('supports Buffer content', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'binary.dat': Buffer.from([0x00, 0x01, 0x02]),
		}, { fs });

		const content = await fixture.readFile('binary.dat');
		expect(content).toEqual(Buffer.from([0x00, 0x01, 0x02]));
	});

	test('supports dynamic content functions', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'info.txt': ({ fixturePath }) => `Root: ${fixturePath}`,
		}, { fs });

		const content = await fixture.readFile('info.txt', 'utf8');
		expect(content).toBe(`Root: ${fixture.path}`);
	});

	test('rm removes individual files', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'a.txt': 'a',
			'b.txt': 'b',
		}, { fs });

		await fixture.rm('a.txt');
		expect(await fixture.exists('a.txt')).toBe(false);
		expect(await fixture.exists('b.txt')).toBe(true);
	});

	test('rm removes entire fixture', async () => {
		const fs = create(new MemoryProvider()).promises;
		const fixture = await createFixture({
			'file.txt': 'content',
			dir: { 'nested.txt': 'nested' },
		}, { fs });

		expect(await fixture.exists('file.txt')).toBe(true);
		await fixture.rm();
		expect(await fixture.exists()).toBe(false);
	});

	test('rm removes directory symlink without deleting target', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			src: { 'index.js': 'code' },
			lib: ({ symlink }) => symlink('./src', 'dir'),
		}, { fs });

		// Verify symlink works
		expect(await fixture.readFile('lib/index.js', 'utf8')).toBe('code');

		// Remove the symlink
		await fixture.rm('lib');

		// Symlink should be gone
		expect(await fixture.exists('lib')).toBe(false);

		// Target should still exist
		expect(await fixture.readFile('src/index.js', 'utf8')).toBe('code');
	});

	test('supports file symlinks', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'target.txt': 'real content',
			'link.txt': ({ symlink }) => symlink('./target.txt'),
		}, { fs });

		expect(await fixture.readFile('link.txt', 'utf8')).toBe('real content');
	});

	test('supports mv', async () => {
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'old.txt': 'content',
		}, { fs });

		await fixture.mv('old.txt', 'new.txt');
		expect(await fixture.exists('old.txt')).toBe(false);
		expect(await fixture.readFile('new.txt', 'utf8')).toBe('content');
	});

	test('respects custom tempDir', async () => {
		const tempDirectory = '/my-fixtures';
		const fs = create(new MemoryProvider()).promises;
		await using fixture = await createFixture({
			'file.txt': 'content',
		}, {
			fs,
			tempDir: tempDirectory,
		});

		// path.resolve normalizes the tempDir (e.g. on Windows: C:\my-fixtures)
		const resolved = path.resolve(tempDirectory);
		expect(fixture.path.startsWith(resolved)).toBe(true);
		expect(await fixture.readFile('file.txt', 'utf8')).toBe('content');
	});

	test('throws for template directory source without cp', async () => {
		const fs = create(new MemoryProvider()).promises;
		await expect(
			createFixture('./some-path', { fs }),
		).rejects.toThrow(TypeError);
	});

	test('fixtures without mkdtemp do not conflict across module instances', async () => {
		// @platformatic/vfs has no mkdtemp(), so fs-fixture generates the fixture name
		const fs = create(new MemoryProvider()).promises;

		// Query strings load fresh module instances, like the ESM and CJS builds in one process
		const fsFixtureUrl = import.meta.resolve('#fs-fixture');
		const [first, second] = await Promise.all([
			import(`${fsFixtureUrl}?instance=1`),
			import(`${fsFixtureUrl}?instance=2`),
		]) as [FsFixtureModule, FsFixtureModule];

		await using firstFixture = await first.createFixture({ 'a.txt': 'a' }, { fs });
		await using secondFixture = await second.createFixture({ 'b.txt': 'b' }, { fs });

		expect(firstFixture.path).not.toBe(secondFixture.path);
		expect(await firstFixture.readdir()).toStrictEqual(['a.txt']);
	});

	test('parallel fixtures do not conflict', async () => {
		const fs = create(new MemoryProvider()).promises;
		const fixtures = await Promise.all(
			Array.from({ length: 10 }, (_, index) => createFixture({
				'id.txt': String(index),
			}, { fs })),
		);

		try {
			const paths = new Set(fixtures.map(f => f.path));
			expect(paths.size).toBe(10);

			for (let index = 0; index < fixtures.length; index += 1) {
				expect(await fixtures[index].readFile('id.txt', 'utf8')).toBe(String(index));
			}
		} finally {
			await Promise.all(fixtures.map(f => f.rm()));
		}
	});
});
