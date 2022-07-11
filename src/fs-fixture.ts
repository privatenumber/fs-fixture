import { promises as fsPromises } from 'fs';
import path from 'path';
import { temporaryDirectory, getId } from './utils';

class FsFixture {
	/**
	Path to the fixture directory.
	*/
	path: string;

	/**
	Create a Fixture instance from a path. Does not create the fixture directory.
	*/
	constructor(fixturePath: string) {
		this.path = fixturePath;
	}

	/**
	Static method to create a fixture from a template directory.
	*/
	static async createFromTemplate(
		fromTemplatePath: string,
	) {
		const fixturePath = path.resolve(
			temporaryDirectory,
			`${path.basename(fromTemplatePath)}-${getId()}`,
		);

		const fixture = new this(fixturePath);

		if (await fixture.exists()) {
			await fixture.rm();
		}

		await fsPromises.mkdir(fixture.path, {
			recursive: true,
		});

		await fsPromises.cp(
			fromTemplatePath,
			fixture.path,
			{
				recursive: true,
				filter: source => !path.basename(source).startsWith('.'),
			},
		);

		return fixture;
	}

	/**
	Check if the fixture exists. Pass in a subpath to check if it exists.
	*/
	exists(subpath = '') {
		return fsPromises.access(path.join(this.path, subpath)).then(
			() => true,
			() => false,
		);
	}

	/**
	Delete the fixture directory. Pass in a subpath to delete it.
	*/
	rm(subpath = '') {
		return fsPromises.rm(path.join(this.path, subpath), {
			recursive: true,
			force: true,
		});
	}

	/**
	Create a file in the fixture directory.
	*/
	writeFile(filePath: string, content: string) {
		return fsPromises.writeFile(
			path.join(this.path, filePath),
			content,
		);
	}

	/**
	Create a JSON file in the fixture directory.
	*/
	writeJson(filePath: string, json: any) {
		return this.writeFile(
			filePath,
			JSON.stringify(json, null, 2),
		);
	}

	/**
	Read a file from the fixture directory.
	*/
	readFile(filePath: string, encoding?: BufferEncoding) {
		return fsPromises.readFile(
			path.join(this.path, filePath),
			encoding,
		);
	}
}

export default FsFixture;
