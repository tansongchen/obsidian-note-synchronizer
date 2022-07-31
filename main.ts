import { App, Editor, MarkdownView, Modal, normalizePath, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import Anki from 'src/anki';
import { MD5 } from 'object-hash';
import { assert } from 'console';
import { Note, getYAMLAndBody, Metadata } from 'src/note';

// Remember to rename these classes and interfaces!

interface Settings {
	mySetting: string;
}

const DEFAULT_SETTINGS: Settings = {
	mySetting: 'default'
}

export default class AnkiSynchronizer extends Plugin {
	anki: Anki;
	settings: Settings;
	state: Record<number, {path: string, hash: string}>;
	noteTypes: Map<string, Array<string>>;
	templatesPath: string;
	templatesFolder: TFolder;

	async onload() {
		console.log('Loading plugin...');
		this.anki = new Anki();
		this.state = {};
		this.noteTypes = new Map<string, Array<string>>();
		const templatesPlugin = (this.app as any).internalPlugins?.plugins['templates'];
		assert(templatesPlugin?.enabled);
		this.templatesPath = normalizePath(templatesPlugin.instance.options.folder);
		this.templatesFolder = this.app.vault.getAbstractFileByPath(this.templatesPath) as TFolder;
		await this.loadAll();

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('Hello, world!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
			id: 'synchronize',
			name: 'Synchronize',
			callback: async () => await this.synchronize()
		});

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new SampleSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async onunload() {
		console.log('Unloading plugin...');
		await this.saveAll();
	}

	async loadAll() {
		const { settings, state } = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);
		if (state) {
			for (const [key, value] of Object.entries(state)) {
				this.state[parseInt(key)] = value;
			}
		}
	}

	async saveAll() {
		await this.saveData({
			settings: this.settings,
			state: this.state
		});
	}

	async synchronize() {
		await this.importNoteTypes();
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
				const { path, hash } = this.state[metadata.id];
				if (path !== file.path) {
					const { cards } = (await this.anki.notesInfo([metadata.id]))[0];
					const [cardIds, deck] = note.changeDeckRequest(cards);
					console.log('Change deck');
					console.log(cardIds, deck);
					this.anki.changeDeck(cardIds, deck);
				}
				if (hash !== MD5(content)) {
					const [id, fields] = note.updateFieldsRequest();
					console.log('Update fields')
					console.log(id, fields);
					this.anki.updateFields(id, fields);
				}
				allID.delete(metadata.id);
			} else if (metadata.id === 0)  {
				const ankiNote = note.addNoteRequest();
				console.log('Add note');
				console.log(ankiNote);
				const id = await this.anki.addNote(ankiNote);
				note.addID(id);
				this.state[id] = {path: file.path, hash: MD5(content)};
				assert(metadata.id !== 0);
			} else {
				this.state[metadata.id] = {path: file.path, hash: MD5(content)};
			}
		}
		for (const id of allID) {
			delete this.state[id];
		}
	}

	async importNoteTypes() {
		const noteTypeNames = await this.anki.noteTypes();
		for (const noteType of noteTypeNames) {
			const fields = await this.anki.fields(noteType);
			this.noteTypes.set(noteType, fields);
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

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: AnkiSynchronizer;

// 	constructor(app: App, plugin: AnkiSynchronizer) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					console.log('Secret: ' + value);
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveAll();
// 				}));
// 	}
// }
