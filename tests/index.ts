import fs from 'fs/promises';
import path from 'path';
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
			},
		});

		expect<FsFixture>(fixture);

		const filePathA = path.join(fixture.path, 'directory/a');
		const filePathB = path.join(fixture.path, 'directory/b');

		// exists
		expect(await fixture.exists('directory/a')).toBe(true);
		expect(await exists(filePathA)).toBe(true);

		// readFile
		expect(await fs.readFile(filePathA, 'utf8')).toBe('a');
		expect(await fixture.readFile('directory/a', 'utf8')).toBe('a');
		expect(await fs.readFile(filePathB, 'utf8')).toBe('b');
		expect(await fixture.readFile('directory/b', 'utf8')).toBe('b');

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

		const filePathA = path.join(fixture.path, 'a');
		const filePathB = path.join(fixture.path, 'directory/b');

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

		// eslint-disable-next-line no-lone-blocks
		{
			await using fixture = await createFixture({});
			fixturePath = fixture.path;
			expect(await exists(fixturePath)).toBe(true);
		}
		expect(await exists(fixturePath)).toBe(false);
	});
});
