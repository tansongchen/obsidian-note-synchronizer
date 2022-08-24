import AnkiSynchronizer from 'main';
import { Notice, TFile } from 'obsidian';
import Note, { FrontMatter } from 'src/note';
import Anki, { AnkiError } from './anki';
import Formatter from './format';

abstract class State<K, V, I = undefined> extends Map<K, V> {
  protected plugin: AnkiSynchronizer;
  protected anki: Anki;

  constructor(plugin: AnkiSynchronizer) {
    super();
    this.plugin = plugin;
    this.anki = plugin.anki;
  }

  async change(state: Map<K, V | [V, I]>) {
    const _keys = [...this.keys()];
    const keys = [...state.keys()];
    for (const [key, wrap] of state.entries()) {
      if (Array.isArray(wrap)) {
        const [value, info] = wrap;
        await this.update(key, value, info);
        this.set(key, value);
      } else {
        await this.update(key, wrap);
        this.set(key, wrap);
      }
    }
    for (const key of _keys.filter(x => !keys.includes(x))) {
      this.delete(key);
    }
  }

  abstract update(key: K, value: V, info?: I): Promise<void>;
}

export type NoteTypeDigest = { name: string, fieldNames: string[] };

export class NoteTypeState extends State<number, NoteTypeDigest> {
  private templateFolderPath: string | undefined = undefined;

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

  async update(key: number, value: NoteTypeDigest) {
    if (this.has(key)) {
      this.delete(key);
    }
    const templatePath = `${this.templateFolderPath}/${value.name}.md`;
    const pseudoFrontMatter = {
      mid: key,
      nid: 0,
      tags: [],
      date: "{{date}} {{time}}"
    } as FrontMatter;
    const pseudoFields: Record<string, string> = {};
    value.fieldNames.map(x => pseudoFields[x] = '\n\n');
    const templateNote = new Note(templatePath, value.name, pseudoFrontMatter, pseudoFields);
    const maybeTemplate = this.plugin.app.vault.getAbstractFileByPath(templatePath);
    if (maybeTemplate === null) {
      this.plugin.app.vault.create(templatePath, templateNote.dump())
    } else if (maybeTemplate instanceof TFile) {
      this.plugin.app.vault.modify(maybeTemplate as TFile, templateNote.dump());
    } else {
      new Notice("Bad template type");
    }
    console.log(`Created template ${templatePath}`);
  }
}

export type NoteDigest = { deck: string, hash: string, tags: string[] };

export class NoteState extends State<number, NoteDigest, Note> {
  private formatter: Formatter;

  constructor(plugin: AnkiSynchronizer) {
    super(plugin);
    this.formatter = new Formatter(this.plugin.app.vault.getName(), this.plugin.settings);
  }

  // Existing notes may have 3 things to update: deck, fields, tags
  async update(key: number, value: NoteDigest, info: Note) {
    const current = this.get(key);
    if (!current) return;
    if (current.deck !== value.deck) { // updating deck
      this.updateDeck(key, current, value, info);
      // Obsidian url also need to be updated
      this.updateFields(key, current, value, info);
    }
    if (current.hash !== value.hash) { // updating fields
      this.updateFields(key, current, value, info);
    }
    if (current.tags !== value.tags) { // updating tags
      this.updateTags(key, current, value, info);
    }
  }

  async updateDeck(key: number, current: NoteDigest, value: NoteDigest, note: Note) {
    const deck = note.renderDeckName();
    const notesInfoResponse = await this.anki.notesInfo([note.nid]);
    if (!Array.isArray(notesInfoResponse)) {
      return;
    }
    const { cards } = notesInfoResponse[0];
    console.log(`Changing deck for ${note.title()}`);
    console.log(cards, deck);
    const changeDeckResponse = await this.anki.changeDeck(cards, deck);
    if (changeDeckResponse instanceof AnkiError) {
      console.log(changeDeckResponse, ', try creating');
      await this.anki.createDeck(deck);
      await this.anki.changeDeck(cards, deck);
    } else if (changeDeckResponse instanceof Error) {
      return;
    }
  }

  async updateFields(key: number, current: NoteDigest, value: NoteDigest, note: Note) {
    const fields = this.formatter.format(note.fields);
    console.log(`Updating fields for ${note.title()}`)
    console.log(note.nid, fields);
    await this.anki.updateFields(note.nid, fields);
  }

  async updateTags(key: number, current: NoteDigest, nextValue: NoteDigest, note: Note) {
    const tagsToAdd = note.tags.filter(x => !current.tags.contains(x));
    const tagsToRemove = current.tags.filter(x => !note.tags.contains(x));
    if (tagsToAdd.length) {
      console.log(`Adding tags for ${note.title()}`);
      console.log(tagsToAdd);
      await this.anki.addTagsToNotes([note.nid], tagsToAdd);
    }
    if (tagsToRemove.length) {
      console.log(`Removing tags for ${note.title()}`);
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
      modelName: note.typeName,
      fields: this.formatter.format(note.fields),
      tags: note.tags
    };
    console.log(`Adding note for ${note.title()}`);
    console.log(ankiNote);
    let idOrError = await this.anki.addNote(ankiNote);
    if (idOrError instanceof AnkiError) {
      // if the supposed deck does not exist, create it
      console.log(idOrError.error, ', try creating');
      await this.anki.createDeck(ankiNote.deckName);
      idOrError = await this.anki.addNote(ankiNote);
      if (typeof idOrError !== 'number') {
        return;
      }
    } else if (idOrError instanceof Error) {
      return;
    }
    note.nid = idOrError;
  }
}
