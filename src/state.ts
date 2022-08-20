import AnkiSynchronizer from 'main';
import { Notice, TFile } from 'obsidian';
import { Note } from 'src/note';
import Anki from './anki';
import { Formatter } from './format';

abstract class State<K, V, I = undefined> extends Map<K, V> {
  plugin: AnkiSynchronizer;
  anki: Anki;

  constructor(plugin: AnkiSynchronizer) {
    super();
    this.plugin = plugin;
    this.anki = plugin.anki;
  }

  async change(state: Map<K, [V, I]>) {
    const _keys = [...this.keys()];
    const keys = [...state.keys()];
    for (const [key, [value, info]] of state.entries()) {
      await this.update(key, value, info);
      this.set(key, value);
    }
    for (const key of _keys.filter(x => !keys.includes(x))) {
      this.delete(key);
    }
  }

  abstract update(key: K, value: V, extra: I): Promise<void>;
}

export type NoteTypeDigest = { name: string, fieldNames: string[] };

export class NoteTypeState extends State<number, NoteTypeDigest> {
  templateFolderPath: string | undefined = undefined;

  setTemplatePath(templateFolderPath: string) { this.templateFolderPath = templateFolderPath; }

  delete(key: number) {
    const noteTypeDigest = this.get(key);
    if (noteTypeDigest !== undefined) {
      const templatePath = `${this.templateFolderPath}/${noteTypeDigest.name}.md`;
      const maybeTemplate = this.plugin.app.vault.getAbstractFileByPath(templatePath);
      if (maybeTemplate !== null) {
        this.plugin.app.vault.delete(maybeTemplate);
      }
    }
    return super.delete(key);
  }

  async update(key: number, value: NoteTypeDigest, info: undefined) {
    if (this.has(key)) {
      this.delete(key);
    }
    const templatePath = `${this.templateFolderPath}/${value.name}.md`;
    const maybeTemplate = this.plugin.app.vault.getAbstractFileByPath(templatePath);
    if (maybeTemplate === null) {
      this.plugin.app.vault.create(templatePath, this.generateTemplate(key, value))
    } else if (maybeTemplate instanceof TFile) {
      this.plugin.app.vault.modify(maybeTemplate as TFile, this.generateTemplate(key, value));
    } else {
      new Notice("Bad template type");
    }
    console.log(`Created template ${templatePath}`);
  }

  generateTemplate(noteTypeID: number, digest: NoteTypeDigest) {
    return [
      `---`,
      `mid: ${noteTypeID}`,
      `nid: 0`,
      `tags: []`,
      `date: {{date}} {{time}}`,
      `---`,
      digest.fieldNames.length > 2 ? '\n\n' : '\n',
      digest.fieldNames.slice(2).map(s => `# ${s}\n\n\n`).join('\n')
    ].join('\n');
  }
}

export type NoteDigest = { path: string, hash: string, tags: string[] };

export class NoteState extends State<number, NoteDigest, Note> {
  formatter: Formatter;

  constructor(plugin: AnkiSynchronizer) {
    super(plugin);
    this.formatter = new Formatter(this.plugin);
  }

  // Existing notes may have 3 things to update: deck, fields, tags
  async update(key: number, value: NoteDigest, info: Note) {
    const current = this.get(key);
    if (!current) return;
    if (current.path !== value.path) { // updating deck
      this.updateDeck(key, current, value, info);
    }
    if (current.hash !== value.hash) { // updating fields
      this.updateFields(key, current, value, info);
    }
    if (current.tags !== value.tags) { // updating tags
      this.updateTags(key, current, value, info);
    }
  }

  async updateDeck(key: number, current: NoteDigest, value: NoteDigest, note: Note) {
    const { cards } = (await this.anki.notesInfo([note.nid]))[0];
    const deck = note.renderDeckName();
    console.log(`Changing deck for ${note.file.path}`);
    console.log(cards, deck);
    try {
      await this.anki.changeDeck(cards, deck);
    } catch (error) {
      console.log(error, ', try creating');
      await this.anki.createDeck(deck);
      await this.anki.changeDeck(cards, deck);
    }
  }

  async updateFields(key: number, current: NoteDigest, value: NoteDigest, note: Note) {
    const fields = this.formatter.format(note.fields);
    console.log(`Updating fields for ${note.file.path}`)
    console.log(note.nid, fields);
    await this.anki.updateFields(note.nid, fields);
  }

  async updateTags(key: number, current: NoteDigest, nextValue: NoteDigest, note: Note) {
    const tagsToAdd = note.tags.filter(x => !current.tags.contains(x));
    const tagsToRemove = current.tags.filter(x => !note.tags.contains(x));
    if (tagsToAdd.length) {
      console.log(`Adding tags for ${note.file.path}`);
      console.log(tagsToAdd);
      await this.anki.addTagsToNotes([note.nid], tagsToAdd);
    }
    if (tagsToRemove.length) {
      console.log(`Removing tags for ${note.file.path}`);
      console.log(tagsToRemove);
      await this.anki.removeTagsFromNotes([note.nid], tagsToRemove);
    }
  }

  delete(key: number) {
    this.plugin.anki.deleteNotes([key]);
    return super.delete(key);
  }

  async handleAddNote(note: Note) {
    const ankiNote = {
      deckName: note.renderDeckName(),
      modelName: note.type.name,
      fields: this.formatter.format(note.fields),
      tags: note.tags
    };
    console.log(`Adding note for ${note.file.path}`);
    console.log(ankiNote);
    let id = 0;
    try { // in most cases, the supposed deck should exist
      id = await this.anki.addNote(ankiNote);
    } catch (error) { // if the supposed deck does not exist, create it
      console.log(error, ', try creating');
      await this.anki.createDeck(ankiNote.deckName);
      id = await this.anki.addNote(ankiNote);
    }
    note.nid = id;
    this.plugin.app.vault.modify(note.file, note.dump())
  }
}
