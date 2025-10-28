import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect } from 'manten';
import { createFixture, type FsFixture } from '#fs-fixture';

describe('fs-fixture', ({ test }) => {
	test('creates from no arg', async () => {
		const fixture = await createFixture();

		expect<FsFixture>(fixture);
		expect(await fixture.exists()).toBe(true);

		await fixture.rm();
		expect(await fixture.exists()).toBe(false);
	});

	test('creates from empty object', async () => {
		const fixture = await createFixture({});

		expect<FsFixture>(fixture);
		expect(await fixture.exists()).toBe(true);

		await fixture.rm();
		expect(await fixture.exists()).toBe(false);
	});

	test('creates from JSON', async () => {
		const fixture = await createFixture({
			'directory/a': 'a',
			directory: {
				b: 'b',
				c: ({
					fixturePath,
					filePath,
				}) => JSON.stringify({
					fixturePath,
					filePath,
				}),
				d: ({ symlink }) => symlink('../directory/a'),
			},
			'emptyDirectory/a': {},
			'buffer-file': Buffer.from('binary content'),
			'buffer-from-function': () => Buffer.from('dynamic binary'),
		});

		expect<FsFixture>(fixture);

		// Type assertions for readFile
		const stringResult = await fixture.readFile('directory/a', 'utf8');
		expect<string>(stringResult);

		const bufferResult = await fixture.readFile('directory/a');
		expect<Buffer>(bufferResult);

		const nullEncodingResult = await fixture.readFile('directory/a', null);
		expect<Buffer>(nullEncodingResult);

		// exists
		expect(await fixture.exists('directory/a')).toBe(true);
		expect(await fixture.exists('emptyDirectory/a')).toBe(true);

		// readFile
		expect(await fixture.readFile('directory/a', 'utf8')).toBe('a');
		expect(await fixture.readFile('directory/b', 'utf8')).toBe('b');
		expect(await fixture.readFile('directory/c', 'utf8')).toBe(JSON.stringify({
			fixturePath: fixture.path,
			filePath: fixture.getPath('directory/c'),
		}));
		expect(await fixture.readFile('directory/d', 'utf8')).toBe('a');

		// Test buffer files
		expect(await fixture.readFile('buffer-file')).toEqual(Buffer.from('binary content'));
		expect(await fixture.readFile('buffer-file', 'utf8')).toBe('binary content');
		expect(await fixture.readFile('buffer-from-function')).toEqual(Buffer.from('dynamic binary'));
		expect(await fixture.readFile('buffer-from-function', 'utf8')).toBe('dynamic binary');

		// Test cp method
		await fixture.cp(fixture.getPath('directory/a'), 'directory/a-copy');
		expect(await fixture.readFile('directory/a-copy', 'utf8')).toBe('a');

		await fixture.cp(fixture.getPath('directory/a'));
		expect(await fixture.readFile('a', 'utf8')).toBe('a');

		await fixture.cp(fixture.getPath('directory/a'), 'directory2/');
		expect(await fixture.readFile('directory2/a', 'utf8')).toBe('a');

		// Type assertions for writeFile
		await fixture.writeFile('test-string.txt', 'string content');
		await fixture.writeFile('test-buffer.bin', Buffer.from('buffer content'));
		await fixture.writeFile('test-encoding.txt', 'content', 'utf8');
		await fixture.writeFile('test-options.txt', 'content', { encoding: 'utf8' });

		// Test readdir
		const directoryContents = await fixture.readdir('directory');
		expect(directoryContents).toContain('a');
		expect(directoryContents).toContain('b');
		expect(directoryContents).toContain('c');
		expect(directoryContents).toContain('d');

		const rootContents = await fixture.readdir('');
		expect(rootContents).toContain('directory');
		expect(rootContents).toContain('emptyDirectory');

		// Test readdir with withFileTypes
		const directoryEntriesResult = await fixture.readdir('directory', { withFileTypes: true });
		expect(directoryEntriesResult.length).toBeGreaterThan(0);
		const fileEntry = directoryEntriesResult.find(entry => entry.name === 'a');
		expect(fileEntry?.isFile()).toBe(true);

		// Type assertions for readdir
		const stringArray: string[] = await fixture.readdir('');
		expect(Array.isArray(stringArray)).toBe(true);

		const direntArray: Dirent[] = await fixture.readdir('.', { withFileTypes: true });
		expect(Array.isArray(direntArray)).toBe(true);

		// rm file
		await fixture.rm('directory/a');
		expect(await fixture.exists('directory/a')).toBe(false);

		// rm entire fixture
		await fixture.rm();
		expect(await fixture.exists()).toBe(false);
	});

	test('creates from directory template', async () => {
		const fixture = await createFixture('./tests/fixture-template');

		expect<FsFixture>(fixture);

		// exists
		expect(await fixture.exists('a')).toBe(true);

		// readFile
		expect(await fixture.readFile('a', 'utf8')).toBe('a');
		expect(await fixture.readFile('directory/b', 'utf8')).toBe('b');

		// rm file
		await fixture.rm('a');
		expect(await fixture.exists('a')).toBe(false);

		// rm entire fixture
		await fixture.rm();
		expect(await fixture.exists()).toBe(false);
	});

	test('JSON operations', async () => {
		const fixture = await createFixture();

		// Test writeJson with default spacing (2 spaces)
		await fixture.writeJson('default.json', {
			name: 'test',
			value: 123,
		});
		const defaultContent = await fixture.readFile('default.json', 'utf8');
		expect(defaultContent).toBe('{\n  "name": "test",\n  "value": 123\n}');

		// Test writeJson with custom spacing (4 spaces)
		await fixture.writeJson('fourspace.json', {
			name: 'test',
			value: 123,
		}, 4);
		const fourSpaceContent = await fixture.readFile('fourspace.json', 'utf8');
		expect(fourSpaceContent).toContain('"name"');
		expect(fourSpaceContent).toContain('"value"');
		// Verify 4-space indentation exists
		expect(fourSpaceContent.includes('    "name"')).toBe(true);

		// Test writeJson with tab indentation
		await fixture.writeJson('tab.json', { name: 'test' }, '\t');
		const tabContent = await fixture.readFile('tab.json', 'utf8');
		expect(tabContent).toBe('{\n\t"name": "test"\n}');

		// Test writeJson with minified (no spacing)
		await fixture.writeJson('minified.json', {
			name: 'test',
			value: 123,
		}, 0);
		const minifiedContent = await fixture.readFile('minified.json', 'utf8');
		expect(minifiedContent).toBe('{"name":"test","value":123}');

		// Test readJson with generic type
		type Config = { name: string;
			value: number; };
		const data = await fixture.readJson<Config>('default.json');
		expect<Config>(data);
		expect(data.name).toBe('test');
		expect(data.value).toBe(123);

		// Test readJson without generic type (returns unknown)
		const unknownData = await fixture.readJson('default.json');
		expect<unknown>(unknownData);

		await fixture.rm();
	});

	test('explicit resource management', async () => {
		let fixture: FsFixture;

		{
			await using temporaryFixture = await createFixture({});
			fixture = temporaryFixture;
			expect(await fixture.exists()).toBe(true);
		}

		expect(await fixture.exists()).toBe(false);
	});

	test('custom temporary directory', async () => {
		const customTemporaryDirectory = path.join(os.tmpdir(), `custom-dir-${Date.now()}`);

		const fixture = await createFixture({}, {
			tempDir: customTemporaryDirectory,
		});

		expect(await fixture.exists()).toBe(true);
		expect(fixture.path.startsWith(customTemporaryDirectory)).toBe(true);

		// Clean up (using fs.rm since we need to remove the custom parent directory)
		await fs.rm(customTemporaryDirectory, {
			recursive: true,
			force: true,
		});
	});

	test('custom temporary directory with URL', async () => {
		const customUrl = new URL(`custom-dir-${Date.now()}`, pathToFileURL(os.tmpdir()));

		await using fixture = await createFixture({}, {
			tempDir: customUrl,
		});

		await fs.access(fixture.path);
	});

	test('creates multiple fixtures in parallel without conflict', async () => {
		const fixtureCount = 20;
		const fixtures: FsFixture[] = [];

		try {
			const creationPromises = Array.from({ length: fixtureCount }, () => createFixture());
			const createdFixtures = await Promise.all(creationPromises);
			fixtures.push(...createdFixtures);

			expect(fixtures.length).toBe(fixtureCount);

			// Check that all paths are unique
			const paths = new Set(fixtures.map(f => f.path));
			expect(paths.size).toBe(fixtureCount);

			// Check that all fixtures exist and have the prefix
			for (const fixture of fixtures) {
				expect(fixture.path).toContain('fs-fixture-');
				await fs.access(fixture.path);
			}
		} finally {
			// Cleanup all created fixtures
			await Promise.all(fixtures.map(f => f.rm()));
		}
	});

	test('handles deeply nested file paths without race conditions', async () => {
		await using fixture = await createFixture({
			'a/b/c/d.txt': 'deep file',
			a: {
				b: {
					c: {
						'other.txt': 'sibling',
					},
				},
			},
		});

		expect(await fixture.readFile('a/b/c/d.txt', 'utf8')).toBe('deep file');
		expect(await fixture.readFile('a/b/c/other.txt', 'utf8')).toBe('sibling');
	});

	test('creates parent directories for flat file paths', async () => {
		await using fixture = await createFixture({
			'src/tracked.js': 'const x = "unquoted"',
			'src/untracked.js': 'const y = "also-unquoted"',
			'nested/deep/file.txt': 'content',
		});

		expect(await fixture.readFile('src/tracked.js', 'utf8')).toBe('const x = "unquoted"');
		expect(await fixture.readFile('src/untracked.js', 'utf8')).toBe('const y = "also-unquoted"');
		expect(await fixture.readFile('nested/deep/file.txt', 'utf8')).toBe('content');
	});

	describe('FileTree validation', async ({ test }) => {
		test('throws for invalid function-based content (undefined)', async () => {
			await expect(
				createFixture({
					// @ts-expect-error Testing invalid return type
					'file.txt': () => undefined,
				}),
			).rejects.toThrow(TypeError);
		});

		test('throws for invalid function-based content (null)', async () => {
			await expect(
				createFixture({
					// @ts-expect-error Testing invalid return type
					'file.txt': () => null,
				}),
			).rejects.toThrow(TypeError);
		});

		test('throws for invalid content (array)', async () => {
			await expect(
				createFixture({
					// @ts-expect-error Testing invalid content type
					'a-directory': [],
				}),
			).rejects.toThrow(TypeError);
		});

		test('handles Buffer.from() with byte array', async () => {
			await using fixture = await createFixture({
				'text.txt': 'This is text',
				'binary.dat': Buffer.from([0x00, 0x01, 0x02, 0xFF]),
			});

			const textContent = await fixture.readFile('text.txt', 'utf8');
			expect(textContent).toBe('This is text');

			// Verify binary.dat is created as a file, not a directory
			const stat = await fs.stat(fixture.getPath('binary.dat'));
			expect(stat.isFile()).toBe(true);
			expect(stat.isDirectory()).toBe(false);

			// Verify the binary content is correct
			const binaryContent = await fixture.readFile('binary.dat');
			expect(binaryContent).toEqual(Buffer.from([0x00, 0x01, 0x02, 0xFF]));

			// Verify it contains null bytes when read as UTF-8
			const binaryAsUtf8 = await fixture.readFile('binary.dat', 'utf8');
			expect(binaryAsUtf8.includes('\u0000')).toBe(true);
		});
	});
});
