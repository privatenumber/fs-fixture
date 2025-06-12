import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect } from 'manten';
import { createFixture, type FsFixture } from '#fs-fixture';

const exists = (checkPath: string) => fs.access(checkPath).then(() => true, () => false);

describe('fs-fixture', ({ test }) => {
	test('creates from no arg', async () => {
		const fixture = await createFixture();

		expect<FsFixture>(fixture);

		// exists
		expect(await fixture.exists()).toBe(true);
		expect(await exists(fixture.path)).toBe(true);

		// rm entire fixture
		await fixture.rm();

		// should not exist
		expect(await fixture.exists()).toBe(false);
		expect(await exists(fixture.path)).toBe(false);
	});

	test('creates from empty object', async () => {
		const fixture = await createFixture({});

		expect<FsFixture>(fixture);

		// exists
		expect(await fixture.exists()).toBe(true);
		expect(await exists(fixture.path)).toBe(true);

		// rm entire fixture
		await fixture.rm();

		// should not exist
		expect(await fixture.exists()).toBe(false);
		expect(await exists(fixture.path)).toBe(false);
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
		});

		expect<FsFixture>(fixture);

		const filePathA = fixture.getPath('directory/a');
		const filePathB = fixture.getPath('directory/b');

		// exists
		expect(await fixture.exists('directory/a')).toBe(true);
		expect(await exists(filePathA)).toBe(true);

		// readFile
		expect(await fs.readFile(filePathA, 'utf8')).toBe('a');
		expect(await fixture.readFile('directory/a', 'utf8')).toBe('a');
		expect(await fs.readFile(filePathB, 'utf8')).toBe('b');
		expect(await fixture.readFile('directory/b', 'utf8')).toBe('b');
		expect(await fixture.readFile('directory/c', 'utf8')).toBe(JSON.stringify({
			fixturePath: fixture.path,
			filePath: fixture.getPath('directory/c'),
		}));
		expect(await fixture.readFile('directory/d', 'utf8')).toBe('a');

		await fixture.cp(filePathA, 'directory/a-copy');
		expect(await fixture.readFile('directory/a-copy', 'utf8')).toBe('a');

		// rm file
		await fixture.rm('directory/a');

		expect(await fixture.exists('directory/a')).toBe(false);

		// rm entire fixture
		await fixture.rm();

		// should not exist
		expect(await fixture.exists()).toBe(false);
		expect(await exists(fixture.path)).toBe(false);
	});

	test('creates from directory template', async () => {
		const fixture = await createFixture('./tests/fixture-template');

		expect<FsFixture>(fixture);

		const filePathA = fixture.getPath('a');
		const filePathB = fixture.getPath('directory/b');

		// exists
		expect(await fixture.exists('a')).toBe(true);
		expect(await exists(filePathA)).toBe(true);

		// readFile
		expect(await fs.readFile(filePathA, 'utf8')).toBe('a');
		expect(await fixture.readFile('a', 'utf8')).toBe('a');
		expect(await fs.readFile(filePathB, 'utf8')).toBe('b');
		expect(await fixture.readFile('directory/b', 'utf8')).toBe('b');

		// rm file
		await fixture.rm('a');

		expect(await fixture.exists('a')).toBe(false);

		// rm entire fixture
		await fixture.rm();

		// should not exist
		expect(await fixture.exists()).toBe(false);
		expect(await exists(fixture.path)).toBe(false);
	});

	test('explicit resource management', async () => {
		let fixturePath: string;

		{
			await using fixture = await createFixture({});
			fixturePath = fixture.path;
			expect(await exists(fixturePath)).toBe(true);
		}
		expect(await exists(fixturePath)).toBe(false);
	});

	test('explicit resource management - debug', async () => {
		let fixturePath: string;

		{
			await using fixture = await createFixture({});
			fixturePath = fixture.path;
			expect(await exists(fixturePath)).toBe(true);
			try {
				throw new Error('Debugging fixture');
			} catch {
				fixture.debug();
			}
		}
		expect(await exists(fixturePath)).toBe(true);
	});

	test('custom temporary directory', async () => {
		const customTemporaryDirectory = path.join(await fs.realpath(os.tmpdir()), `custom-dir-${Date.now()}`);

		const fixture = await createFixture({}, {
			tempDir: customTemporaryDirectory,
		});

		expect(await fixture.exists()).toBe(true);
		expect(fixture.getPath().startsWith(customTemporaryDirectory)).toBe(true);

		await fs.rm(customTemporaryDirectory, {
			recursive: true,
			force: true,
		});
	});
});
