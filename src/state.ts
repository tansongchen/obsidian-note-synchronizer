import AnkiSynchronizer from 'main';
import { Notice, TFile } from 'obsidian';
import Note, { FrontMatter } from 'src/note';
import Media from './media';
import Anki from './anki';
import Formatter from './format';
import locale from './lang';

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

export type NoteTypeDigest = { name: string; fieldNames: string[] };

export class NoteTypeState extends State<number, NoteTypeDigest> {
  private templateFolderPath: string | undefined = undefined;

  setTemplatePath(templateFolderPath: string) {
    this.templateFolderPath = templateFolderPath;
  }

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
    const pseudoFrontMatter = {
      mid: key,
      nid: 0,
      tags: [],
      date: '{{date}} {{time}}'
    } as FrontMatter;
    const pseudoFields: Record<string, string> = {};
    value.fieldNames.map(x => (pseudoFields[x] = '\n\n'));
    const templateNote = new Note(
      value.name,
      this.templateFolderPath!,
      value.name,
      pseudoFrontMatter,
      pseudoFields
    );
    const templatePath = `${this.templateFolderPath}/${value.name}.md`;
    const maybeTemplate = this.plugin.app.vault.getAbstractFileByPath(templatePath);
    if (maybeTemplate !== null) {
      await this.plugin.app.vault.modify(
        maybeTemplate as TFile,
        this.plugin.noteManager.dump(templateNote)
      );
    } else {
      await this.plugin.app.vault.create(templatePath, this.plugin.noteManager.dump(templateNote));
    }
    console.log(`Created template ${templatePath}`);
  }
}

export type NoteDigest = { deck: string; hash: string; tags: string[] };

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
    if (current.deck !== value.deck) {
      // updating deck
      this.updateDeck(key, current, value, info);
    }
    if (current.hash !== value.hash) {
      // updating fields
      this.updateFields(key, current, value, info);
    }
    if (current.tags !== value.tags) {
      // updating tags
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
    console.log(`Changing deck for ${note.title()}`, deck);
    let changeDeckResponse = await this.anki.changeDeck(cards, deck);
    if (changeDeckResponse === null) return;

    // if the supposed deck does not exist, create it
    if (changeDeckResponse.message.contains('deck was not found')) {
      console.log(changeDeckResponse.message, ', try creating');
      const createDeckResponse = await this.anki.createDeck(deck);
      if (createDeckResponse === null) {
        changeDeckResponse = await this.anki.changeDeck(cards, deck);
        if (changeDeckResponse === null) return;
      }
    }

    new Notice(locale.synchronizeChangeDeckFailureNotice(note.title()));
  }

  async updateFields(key: number, current: NoteDigest, value: NoteDigest, note: Note) {
    const fields = this.formatter.format(note);
    console.log(`Updating fields for ${note.title()}`, fields);
    const updateFieldsResponse = await this.anki.updateFields(note.nid, fields);
    if (updateFieldsResponse === null) return;
    new Notice(locale.synchronizeUpdateFieldsFailureNotice(note.title()));
  }

  async updateTags(key: number, current: NoteDigest, nextValue: NoteDigest, note: Note) {
    const tagsToAdd = note.tags.filter(x => !current.tags.contains(x));
    const tagsToRemove = current.tags.filter(x => !note.tags.contains(x));
    let addTagsResponse = null,
      removeTagsResponse = null;
    if (tagsToAdd.length) {
      console.log(`Adding tags for ${note.title()}`, tagsToAdd);
      addTagsResponse = await this.anki.addTagsToNotes([note.nid], tagsToAdd);
    }
    if (tagsToRemove.length) {
      console.log(`Removing tags for ${note.title()}`, tagsToRemove);
      removeTagsResponse = await this.anki.removeTagsFromNotes([note.nid], tagsToRemove);
    }
    if (addTagsResponse || removeTagsResponse)
      new Notice(locale.synchronizeUpdateTagsFailureNotice(note.title()));
  }

  delete(key: number) {
    this.plugin.anki.deleteNotes([key]);
    return super.delete(key);
  }

  async handleAddNote(note: Note) {
    const ankiNote = {
      deckName: note.renderDeckName(),
      modelName: note.typeName,
      fields: this.formatter.format(note),
      tags: note.tags
    };
    console.log(`Adding note for ${note.title()}`, ankiNote);
    let idOrError = await this.anki.addNote(ankiNote);
    if (typeof idOrError === 'number') {
      return idOrError;
    }

    // if the supposed deck does not exist, create it
    if (idOrError.message.contains('deck was not found')) {
      console.log(idOrError.message, ', try creating');
      const didOrError = await this.anki.createDeck(ankiNote.deckName);
      if (typeof didOrError === 'number') {
        idOrError = await this.anki.addNote(ankiNote);
        if (typeof idOrError === 'number') {
          return idOrError;
        }
      }
    } else {
      console.log(idOrError.message);
    }
  }

  async handleAddMedia(media: Media) {
    console.log(`Adding media ${media.filename}`, media);
    await this.anki.addMedia(media);
  }
}
