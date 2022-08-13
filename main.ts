import { App, normalizePath, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import Anki from 'src/anki';
import { MD5 } from 'object-hash';
import { assert } from 'console';
import { Note, getYAMLAndBody, Metadata } from 'src/note';
import { locale } from 'src/lang';

interface Settings {
	render: boolean;
}

const DEFAULT_SETTINGS: Settings = {
	render: false,
}

export default class AnkiSynchronizer extends Plugin {
	anki: Anki;
	settings: Settings;
	state: Record<number, {path: string, hash: string, tags: string[]}>;
	noteTypes: Record<string, Array<string>>;
	templatesPath: string;
	templatesFolder: TFolder;

	async onload() {
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
			name: locale.synchronizeCommandName,
			callback: async () => await this.synchronize()
		});

		this.addCommand({
			id: 'import',
			name: locale.importCommandName,
			callback: async () => await this.importNoteTypes()
		});

		this.addSettingTab(new AnkiSynchronizerSettingTab(this.app, this));
		console.log(locale.onLoad);
	}

	async onunload() {
		await this.saveAll();
		console.log(locale.onUnload);
	}

	async loadAll() {
		const data = await this.loadData();
		if (data !== null) {
			const { settings, state, noteTypes } = data;
			Object.assign(this.settings, settings);
			for (const [key, value] of Object.entries(state)) {
				this.state[parseInt(key)] = value;
			}
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
		new Notice(locale.synchronizeStartNotice);
		try {
			const version = await this.anki.version();
			if (version !== 6) {
				new Notice(locale.synchronizeBadAnkiConnectNotice, 5000);
				return;
			}
		} catch (e) {
			new Notice(locale.synchronizeAnkiConnectUnavailableNotice, 5000);
			return;
		}
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
			const note = new Note(this, file, metadata, body);
			if (this.state.hasOwnProperty(metadata.id)) { // existing file
				const { path, hash, tags } = this.state[metadata.id];
				if (path !== file.path) {
					const { cards } = (await this.anki.notesInfo([metadata.id]))[0];
					const deck = note.renderDeckName();
					console.log(`Changing deck for ${file.path}`);
					console.log(cards, deck);
					try {
						await this.anki.changeDeck(cards, deck);
					} catch (error) {
						console.log(error, ', try creating');
						await this.anki.createDeck(deck);
						await this.anki.changeDeck(cards, deck);
					}
					this.state[metadata.id].path = file.path;
				}
				if (hash !== MD5(body.join('\n'))) {
					const fields = note.parseFields();
					console.log(`Updating fields for ${file.path}`)
					console.log(metadata.id, fields);
					await this.anki.updateFields(metadata.id, fields);
					this.state[metadata.id].hash = MD5(body.join('\n'));
				}
				if (tags !== metadata.tags) {
					const tagsToAdd = metadata.tags.filter(x => !tags.contains(x));
					const tagsToRemove = tags.filter(x => !metadata.tags.contains(x));
					if (tagsToAdd.length) {
						console.log(`Adding tags for ${file.path}`);
						console.log(tagsToAdd);
						await this.anki.addTagsToNotes([metadata.id], tagsToAdd);
					}
					if (tagsToRemove.length) {
						console.log(`Removing tags for ${file.path}`);
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
				console.log(`Adding note for ${file.path}`);
				console.log(ankiNote);
				let id = 0;
				try {
					id = await this.anki.addNote(ankiNote);
				} catch (error) {
					console.log(error, ', try creating');
					await this.anki.createDeck(ankiNote.deckName);
					id = await this.anki.addNote(ankiNote);
				}
				note.addID(id);
				this.state[id] = {path: file.path, hash: MD5(body.join('\n')), tags: metadata.tags};
			} else { // out of sync, ignore
				this.state[metadata.id] = {path: file.path, tags: metadata.tags, hash: MD5(body.join('\n'))};
			}
		}
		for (const id of allID) {
			delete this.state[id];
		}
		new Notice(locale.synchronizeSuccessNotice);
	}

	async importNoteTypes() {
		new Notice(locale.importStartNotice);
		const allNoteTypeNames = new Set(Object.keys(this.noteTypes));
		const noteTypeNames = await this.anki.noteTypes();
		for (const noteType of noteTypeNames) {
			const fields = await this.anki.fields(noteType);
			const templatePath = `${this.templatesPath}/${noteType}.md`
			if (this.noteTypes.hasOwnProperty(noteType)) {
				if (fields !== this.noteTypes[noteType]) {
					const maybeTemplate = this.app.vault.getAbstractFileByPath(templatePath);
					this.app.vault.modify(maybeTemplate as TFile, generateTemplate(noteType, fields));
				}
				allNoteTypeNames.delete(noteType);
			} else {
				this.app.vault.create(templatePath, generateTemplate(noteType, fields));
			}
			this.noteTypes[noteType] = fields;
		}
		for (const noteType of allNoteTypeNames) {
			delete this.noteTypes[noteType];
			const templatePath = `${this.templatesPath}/${noteType}.md`;
			const template = this.app.vault.getAbstractFileByPath(templatePath);
			this.app.vault.delete(template);
		}
		new Notice(locale.importSuccessNotice);
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

		containerEl.createEl('h2', {text: locale.settingTabHeader});

		new Setting(containerEl)
			.setName(locale.settingRenderName)
			.setDesc(locale.settingRenderDescription)
			.addToggle(v => v
				.setValue(this.plugin.settings.render)
				.onChange(async (value) => {
					this.plugin.settings.render = value;
				}));
	}
}
