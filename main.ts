import { App, normalizePath, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import Anki from 'src/anki';
import { MD5 } from 'object-hash';
import { assert } from 'console';
import { Note, getYAMLAndBody, Metadata } from 'src/note';

interface Settings {
	mySetting: string;
}

const DEFAULT_SETTINGS: Settings = {
	mySetting: 'default'
}

export default class AnkiSynchronizer extends Plugin {
	anki: Anki;
	settings: Settings;
	state: Record<number, {path: string, hash: string, tags: string[]}>;
	noteTypes: Record<string, Array<string>>;
	templatesPath: string;
	templatesFolder: TFolder;

	async onload() {
		console.log('Loading plugin...');
		this.anki = new Anki();
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
		this.state = {};
		this.noteTypes = {};
		const templatesPlugin = (this.app as any).internalPlugins?.plugins['templates'];
		assert(templatesPlugin?.enabled);
		this.templatesPath = normalizePath(templatesPlugin.instance.options.folder);
		this.templatesFolder = this.app.vault.getAbstractFileByPath(this.templatesPath) as TFolder;
		await this.loadAll();

		this.addCommand({
			id: 'synchronize',
			name: 'Synchronize',
			callback: async () => await this.synchronize()
		});

		this.addCommand({
			id: 'import',
			name: 'Import Note Types',
			callback: async () => await this.importNoteTypes()
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new AnkiSynchronizerSettingTab(this.app, this));
	}

	async onunload() {
		console.log('Unloading plugin...');
		await this.saveAll();
	}

	async loadAll() {
		const { settings, state, noteTypes } = await this.loadData();
		if (settings) {
			Object.assign(this.settings, settings);
		}
		if (state) {
			for (const [key, value] of Object.entries(state)) {
				this.state[parseInt(key)] = value;
			}
		}
		if (noteTypes) {
			Object.assign(this.noteTypes, noteTypes);
		}
	}

	async saveAll() {
		await this.saveData({
			settings: this.settings,
			state: this.state,
			noteTypes: this.noteTypes
		});
	}

	async synchronize() {
		new Notice('Synchronizing to Anki...');
		const allFiles = this.app.vault.getMarkdownFiles();
		const allID = new Set(Object.keys(this.state).map(Number));
		for (const file of allFiles) {
			// ignore templates
			if (file.parent == this.templatesFolder) {
				continue;
			}
			// read and validate content
			const content = await this.app.vault.read(file);
			if (content.slice(0, 3) !== '---') {
				continue;
			}
			const [yaml, body] = getYAMLAndBody(content);
			if (!yaml.hasOwnProperty('type') || !yaml.hasOwnProperty('id') || !yaml.hasOwnProperty('tags')) {
				continue;
			}
			// now it is a valid file
			const metadata = yaml as Metadata;
			console.log('Markdown file: ', file.path)
			console.log(metadata);
			const note = new Note(this, file, metadata, body);
			if (this.state.hasOwnProperty(metadata.id)) { // existing file
				const { path, hash, tags } = this.state[metadata.id];
				if (path !== file.path) {
					const { cards } = (await this.anki.notesInfo([metadata.id]))[0];
					const deck = note.renderDeckName();
					console.log('Change deck');
					console.log(cards, deck);
					await this.anki.changeDeck(cards, deck);
					this.state[metadata.id].path = file.path;
				}
				if (hash !== MD5(body.join('\n'))) {
					const fields = note.parseFields();
					console.log('Update fields')
					console.log(metadata.id, fields);
					await this.anki.updateFields(metadata.id, fields);
					this.state[metadata.id].hash = MD5(body.join('\n'));
				}
				if (tags !== metadata.tags) {
					const tagsToAdd = metadata.tags.filter(x => !tags.contains(x));
					const tagsToRemove = tags.filter(x => !metadata.tags.contains(x));
					if (tagsToAdd.length) {
						console.log('Add tags');
						console.log(tagsToAdd);
						await this.anki.addTagsToNotes([metadata.id], tagsToAdd);
					}
					if (tagsToRemove.length) {
						console.log('Remove tags');
						console.log(tagsToRemove);
						await this.anki.removeTagsFromNotes([metadata.id], tagsToRemove);
					}
					this.state[metadata.id].tags = metadata.tags;
				}
				allID.delete(metadata.id);
			} else if (metadata.id === 0)  { // new file
				const ankiNote = {
					deckName: note.renderDeckName(),
					modelName: metadata.type,
					fields: note.parseFields(),
					tags: metadata.tags
				};
				console.log('Add note');
				console.log(ankiNote);
				const id = await this.anki.addNote(ankiNote);
				note.addID(id);
				this.state[id] = {path: file.path, hash: MD5(body.join('\n')), tags: metadata.tags};
			} else { // out of sync, ignore
				this.state[metadata.id] = {path: file.path, tags: metadata.tags, hash: MD5(body.join('\n'))};
			}
		}
		for (const id of allID) {
			delete this.state[id];
		}
		new Notice('Successfully synchronized to Anki!');
	}

	async importNoteTypes() {
		new Notice('Importing note types from Anki...');
		const noteTypeNames = await this.anki.noteTypes();
		for (const noteType of noteTypeNames) {
			const fields = await this.anki.fields(noteType);
			this.noteTypes[noteType] = fields;
			const templatePath = `${this.templatesPath}/${noteType}.md`
			const maybeTemplate = this.app.vault.getAbstractFileByPath(templatePath);
			if (maybeTemplate === null) {
				this.app.vault.create(templatePath, generateTemplate(noteType, fields));
			} else if (maybeTemplate instanceof TFolder) {
					throw new Error("Folder cannot exist in template folder");
			} else {
				assert(maybeTemplate instanceof TFile);
				this.app.vault.modify(maybeTemplate as TFile, generateTemplate(noteType, fields));
			}
		}
		new Notice('Successfully imported note types from Anki!');
	}
}

const generateTemplate = (noteType: string, fields: Array<string>) => `---
type: ${noteType}
id: 0
tags: []
date: {{date}} {{time}}
---
${fields.length > 2 ? '\n\n' : '\n'}
${fields.slice(2).map(s => `# ${s}\n\n\n`).join('\n')}`

class AnkiSynchronizerSettingTab extends PluginSettingTab {
	plugin: AnkiSynchronizer;

	constructor(app: App, plugin: AnkiSynchronizer) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveAll();
				}));
	}
}
