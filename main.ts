import { normalizePath, Notice, Plugin } from 'obsidian';
import Anki, { AnkiError } from 'src/anki';
import Note, { NoteManager, renderDeckName } from 'src/note';
import { MediaManager } from 'src/media';
import locale from 'src/lang';
import { NoteDigest, NoteState, NoteTypeDigest, NoteTypeState } from 'src/state';
import AnkiSynchronizerSettingTab, { Settings, DEFAULT_SETTINGS } from 'src/setting';
import { version } from './package.json';
import { MD5 } from 'object-hash';

interface Data {
  version: string;
  settings: Settings;
  noteState: Record<string, NoteDigest>;
  noteTypeState: Record<string, NoteTypeDigest>;
}

export default class AnkiSynchronizer extends Plugin {
  anki = new Anki();
  settings = DEFAULT_SETTINGS;
  mediaManager = new MediaManager();
  noteManager = new NoteManager(this.settings);
  noteState = new NoteState(this);
  noteTypeState = new NoteTypeState(this);
  timeout: ReturnType<typeof setTimeout> | null = null



  async onload() {
    // Recover data from local file
    const data: Data | null = await this.loadData();
    if (data) {
      const { settings, noteState, noteTypeState } = data;
      Object.assign(this.settings, settings);
      for (const key in noteState) {
        this.noteState.set(parseInt(key), noteState[key]);
      }
      for (const key in noteTypeState) {
        this.noteTypeState.set(parseInt(key), noteTypeState[key]);
      }
    }
    this.configureUI();
    this.startNewInterval()
    console.log(locale.onLoad);
  }

  configureUI() {
    this.addCommand({
      id: "import",
      name: locale.importCommandName,
      callback: async () => await this.importNoteTypes(),
    });
    this.addCommand({
      id: "synchronize",
      name: locale.synchronizeCommandName,
      callback: async () => await this.synchronize(),
    });

    if (this.settings.showImportIcon)
      this.addRibbonIcon('enter', locale.importCommandName, async () => await this.importNoteTypes());
    if (this.settings.showSyncIcon)
      this.addRibbonIcon(
        'sheets-in-box',
        locale.synchronizeCommandName,
        async () => await this.synchronize()
      );

    // Add a setting tab to configure settings
    this.addSettingTab(new AnkiSynchronizerSettingTab(this.app, this));
  }

  // Save data to local file
  save() {
    return this.saveData({
      version: version,
      settings: this.settings,
      noteState: Object.fromEntries(this.noteState),
      noteTypeState: Object.fromEntries(this.noteTypeState),
    });
  }

  async onunload() {
    this.clearInterval()
    await this.save();
    console.log(locale.onUnload);
  }

  // Retrieve template information from Obsidian core plugin "Templates"
  getTemplatePath() {
    const templatesPlugin = (this.app as any).internalPlugins?.plugins["templates"];
    if (!templatesPlugin?.enabled) {
      new Notice(locale.templatesNotEnabledNotice);
      return;
    }
    if (templatesPlugin.instance.options.folder === undefined) {
      new Notice(locale.templatesFolderUndefinedNotice);
      return;
    }
    return normalizePath(templatesPlugin.instance.options.folder);
  }

  async importNoteTypes() {
    new Notice(locale.importStartNotice);
    const templatesPath = this.getTemplatePath();
    if (templatesPath === undefined) return;
    this.noteTypeState.setTemplatePath(templatesPath);
    const noteTypesAndIds = await this.anki.noteTypesAndIds();
    if (noteTypesAndIds instanceof AnkiError) {
      new Notice(locale.importFailureNotice);
      return;
    }
    const noteTypes = Object.keys(noteTypesAndIds);
    const noteTypeFields = await this.anki.multi<{ modelName: string }, string[]>(
      'modelFieldNames',
      noteTypes.map(s => ({ modelName: s }))
    );
    if (noteTypeFields instanceof AnkiError) {
      new Notice(locale.importFailureNotice);
      return;
    }
    const state = new Map<number, NoteTypeDigest>(
      noteTypes.map((name, index) => [
        noteTypesAndIds[name],
        {
          name: name,
          fieldNames: noteTypeFields[index]
        }
      ])
    );
    console.log(`Retrieved note type data from Anki`, state);
    await this.noteTypeState.change(state);
    await this.save();
    new Notice(locale.importSuccessNotice);
  }

  clearInterval() {
    if (this.timeout !== null) {
      clearInterval(this.timeout)
    }
  }

  startNewInterval() {
    this.clearInterval()
    if (this.settings.autoSync !== 0) {
      this.timeout = setInterval(
        async () => { await this.synchronize() },
        this.settings.autoSync * 1000 * 60
      );
    }
  }


  async synchronize() {
    const templatesPath = this.getTemplatePath();
    if (templatesPath === undefined) return;
    new Notice(locale.synchronizeStartNotice);
    const allFiles = this.app.vault.getMarkdownFiles();
    // in this case undefined is use as a toy value that means that the
    // note is already added
    const state = new Map<number, [NoteDigest, Note | undefined]>();
    for (const file of allFiles) {
      // ignore templates
      if (file.path.startsWith(templatesPath)) continue;
      // read and validate content
      const content = await this.app.vault.cachedRead(file);
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!frontmatter) continue;

      if (frontmatter.nid !== undefined && frontmatter.nid !== 0) {
        const value = this.noteState.get(frontmatter.nid);
        const folder = file.parent.path == '/' ? '' : file.parent.path;
        //TODO Add tags
        const newValue = {
          deck: renderDeckName(folder),
          hash: MD5(content),
          tags: frontmatter.tags
        } as NoteDigest;
        if (value !== undefined && eqNoteDigest(value, newValue)) {
          console.log(file.basename, 'skipped cached')
          state.set(frontmatter.nid, [newValue, undefined]);
          continue;
        }
      } else if (frontmatter.nid == undefined) {
        continue;
      }
      console.log(file.basename, 'full recreation of the note')
      const media = this.app.metadataCache.getFileCache(file)?.embeds;
      if (media) {
        for (const item of media) {
          this.noteState.handleAddMedia(
            this.mediaManager.parseMedia(item, this.app.vault, this.app.metadataCache)
          );
        }
      }
      const [note, mediaNameMap] = this.noteManager.validateNote(
        file,
        frontmatter,
        content,
        media,
        this.noteTypeState
      );
      if (!note) continue;
      if (note.nid === 0) {
        // new file
        const nid = await this.noteState.handleAddNote(note);
        if (nid === undefined) {
          new Notice(locale.synchronizeAddNoteFailureNotice(file.basename));
          continue;
        }
        note.nid = nid;
        this.app.vault.modify(file, this.noteManager.dump(note, mediaNameMap));
      }
      state.set(note.nid, [note.digest(), note]);
    }
    await this.noteState.change(state);
    await this.save();
    new Notice(locale.synchronizeSuccessNotice);
  }

}
function eqNoteDigest(a: NoteDigest, b: NoteDigest): boolean {
  const arraysEqual = (a: string[], b: string[]) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return a.hash === b.hash && a.deck === b.deck && arraysEqual(a.tags, b.tags)
}
