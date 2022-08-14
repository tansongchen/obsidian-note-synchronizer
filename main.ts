import { normalizePath, Notice, Plugin, TFile } from 'obsidian';
import { MD5 } from 'object-hash';
import Anki from 'src/anki';
import { Note, getFrontMatterAndBody, FrontMatter } from 'src/note';
import { locale } from 'src/lang';
import { NoteDigest, NoteState, NoteTypeDigest, NoteTypeState } from 'src/state';
import AnkiSynchronizerSettingTab, { Settings, DEFAULT_SETTINGS } from 'src/setting';
import { version } from './package.json';

interface Data {
    version: string,
    settings: Settings,
    noteState: Record<string, NoteDigest>,
    noteTypeState: Record<string, NoteTypeDigest>
}

export default class AnkiSynchronizer extends Plugin {
    anki = new Anki();
    settings = DEFAULT_SETTINGS;
    noteState = new NoteState(this);
    noteTypeState = new NoteTypeState(this);

    async onload() {
        // Recover data from local file
        const data: (Data | null) = await this.loadData();
        if (data?.version === version) {
            const { settings, noteState, noteTypeState } = data;
            Object.assign(this.settings, settings);
            for (const key in noteState) {
                this.noteState.set(parseInt(key), noteState[key]);
            }
            for (const key in noteTypeState) {
                this.noteTypeState.set(parseInt(key), noteTypeState[key]);
            }
        }
        await this.configureUI();
        console.log(locale.onLoad);
    }

    async configureUI() {
        // Add import note types command
        this.addCommand({
            id: 'import',
            name: locale.importCommandName,
            callback: async () => await this.importNoteTypes()
        });
        this.addRibbonIcon("enter", locale.importCommandName, async () => await this.importNoteTypes());

        // Add synchronize command
        this.addCommand({
            id: 'synchronize',
            name: locale.synchronizeCommandName,
            callback: async () => await this.synchronize()
        });
        this.addRibbonIcon("sheets-in-box", locale.synchronizeCommandName, async () => await this.synchronize());

        // Add a setting tab to configure settings
        this.addSettingTab(new AnkiSynchronizerSettingTab(this.app, this));
    }

    async onunload() {
        // Save data to local file
        await this.saveData({
            version: version,
            settings: this.settings,
            noteState: Object.fromEntries(this.noteState),
            noteTypeState: Object.fromEntries(this.noteTypeState)
        });
        console.log(locale.onUnload);
    }

    // Retrieve template information from Obsidian core plugin "Templates"
    async getTemplatePath() {
        const templatesPlugin = (this.app as any).internalPlugins?.plugins['templates'];
        if (!templatesPlugin?.enabled) {
            new Notice(locale.templatesNotEnabledNotice);
            return undefined;
        }
        return normalizePath(templatesPlugin.instance.options.folder);
    }

    async importNoteTypes() {
        new Notice(locale.importStartNotice);
        const templatesPath = await this.getTemplatePath();
        if (!templatesPath) return;
        this.noteTypeState.setTemplatePath(templatesPath);
        const noteTypesAndIds = await this.anki.noteTypesAndIds();
        const noteTypes = Object.keys(noteTypesAndIds);
        const noteTypeFields = await this.anki.multi<{modelName: string}, string[]>('modelFieldNames', noteTypes.map(s => ({modelName: s})));
        const state = new Map<number, NoteTypeDigest>(noteTypes.map((name, index) => [noteTypesAndIds[name], {
            name: name,
            fieldNames: noteTypeFields[index]
        }]));
        console.log('Note type data retrieved from Anki:');
        console.log(state);
        await this.noteTypeState.change(state);
        new Notice(locale.importSuccessNotice);
    }

    async synchronize() {
        const templatesPath = await this.getTemplatePath();
        if (!templatesPath) return;
        new Notice(locale.synchronizeStartNotice);
        const allFiles = this.app.vault.getMarkdownFiles();
        const state = new Map<number, NoteDigest>();
        const extra = new Map<number, Note>();
        for (const file of allFiles) {
            const note = await this.validateNote(file, templatesPath);
            if (!note) continue;
            if (note.nid === 0) { // new file
                await this.noteState.handleAddNote(note);
            }
            state.set(note.nid, { path: note.file.path, hash: MD5(note.fields), tags: note.tags });
            extra.set(note.nid, note);
        }
        await this.noteState.change(state, extra);
        new Notice(locale.synchronizeSuccessNotice);
    }

    async validateNote(file: TFile, templatesPath: string) {
        // ignore templates
        if (file.path.startsWith(templatesPath)) return;
        // read and validate content
        const content = await this.app.vault.read(file);
        if (content.slice(0, 3) !== '---') return;
        const [maybeFrontMatter, body] = getFrontMatterAndBody(content);
        if (!maybeFrontMatter.hasOwnProperty('mid') || !maybeFrontMatter.hasOwnProperty('nid') || !maybeFrontMatter.hasOwnProperty('tags')) return;
        // now it is a valid file
        const frontMatter = maybeFrontMatter as FrontMatter;
        const fieldNames = this.noteTypeState.get(frontMatter.mid).fieldNames;
        return new Note(file, frontMatter, body, fieldNames);
    }
}
