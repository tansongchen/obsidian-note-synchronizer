import { assert } from "console";
import { TFile, parseYaml, TAbstractFile, stringifyYaml } from "obsidian";
import AnkiSynchronizer from "main";
import MarkdownIt from "markdown-it";

const mdit = new MarkdownIt();

export interface Metadata {
	type: string,
	id: number,
	tags: Array<string>
}

export function getYAMLAndBody(raw: string): [object, string[]] {
	const lines = raw.split('\n');
	assert(lines.length >= 2 && lines[0].trim() == '---');
	const yamlLines: string[] = [];
	let index = 1;
	while (lines[index].trim() !== '---') {
		yamlLines.push(lines[index]);
		index += 1;
		if (index == lines.length) {
			throw new Error("Bad YAML");
		}
	}
	const yaml = parseYaml(yamlLines.join('\n')) as object;
	const body = lines.slice(index + 1);
	return [yaml, body]
}

export class Note {
	file: TFile;
	metadata: Metadata
	body: string[];
	plugin: AnkiSynchronizer;

	constructor(plugin: AnkiSynchronizer, file: TFile, metadata: Metadata, body: string[]) {
		this.plugin = plugin;
		this.file = file;
		this.metadata = metadata;
		this.body = body;
	}

	isNew() {
		return this.metadata.id === 0;
	}


	addID(id: number) {
		this.metadata.id = id;
		this.plugin.app.vault.modify(this.file, this.dump())
	}

	dump() {
		const yaml = stringifyYaml(this.metadata);
		return `---\n${yaml}---\n${this.body.join('\n')}`
	}

	renderBacklink = (basename: string) => {
		const url = "obsidian://open?vault=" + encodeURIComponent(this.plugin.app.vault.getName()) + String.raw`&file=` + encodeURIComponent(basename);
		return `[${basename}](${url})`
	}

	transformField(content: string) {
		const md = content.replace(/\[\[(\w+)\]\]/, (match, p) => {
			const backlink = this.renderBacklink(p);
			return `[${p}](${backlink})`
		});
		if (!this.plugin.settings.render) {
			return md;
		}
		return mdit.render(md);
	}

	parseFields() {
		const fieldNames = this.plugin.noteTypes[this.metadata.type];
		assert(fieldNames.length >= 2);
		const fields: string[] = [this.renderBacklink(this.file.basename)];
		let buffer: Array<string> = [];
		for (const line of this.body) {
			if (line.slice(0, 2) === '# ') {
				fields.push(buffer.join('\n'));
				buffer = [];
			} else {
				buffer.push(line)
			}
		}
		fields.push(buffer.join('\n'));
		const result: Record<string, string> = {};
		fieldNames.forEach((key, index) => result[key] = this.transformField(fields[index]));
		return result;
	}

	renderDeckName() {
		return (this.file as TAbstractFile).path.split('/').slice(0, -1).join('::') || 'Obsidian';
	}
}
