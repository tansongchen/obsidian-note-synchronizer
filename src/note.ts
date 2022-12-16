import { stringifyYaml, FrontMatterCache, TFile } from "obsidian";
import { NoteDigest, NoteTypeDigest } from "./state";
import { MD5 } from 'object-hash';
import { Settings } from "./setting";

export interface FrontMatter {
  mid: number,
  nid: number,
  tags: string[]
}

export default class Note {
  basename: string;
  folder: string;
  nid: number;
  mid: number;
  tags: string[];
  fields: Record<string, string>;
  typeName: string;
  extras: object;

  constructor(basename: string, folder: string, typeName: string, frontMatter: FrontMatter, fields: Record<string, string>) {
    this.basename = basename;
    this.folder = folder;
    const { mid, nid, tags, ...extras } = frontMatter;
    this.typeName = typeName;
    this.mid = mid;
    this.nid = nid;
    this.tags = tags;
    this.extras = extras;
    this.fields = fields;
  }

  digest(): NoteDigest {
    return { deck: this.renderDeckName(), hash: MD5(this.fields), tags: this.tags }
  }

  title() {
    return this.basename;
  }

  renderDeckName() {
    return this.folder.replace('/', '::') || 'Obsidian';
  }

  isCloze() {
    return this.typeName === '填空题' || this.typeName === 'Cloze';
  }
}

export class NoteManager {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  validateNote(file: TFile, frontmatter: FrontMatterCache, content: string, noteTypes: Map<number, NoteTypeDigest>) {
    if (!frontmatter.hasOwnProperty('mid') || !frontmatter.hasOwnProperty('nid') || !frontmatter.hasOwnProperty('tags')) return;
    const frontMatter = Object.assign({}, frontmatter, { position: undefined }) as FrontMatter;
    const lines = content.split('\n');
    const yamlEndIndex = lines.indexOf('---', 1);
    const body = lines.slice(yamlEndIndex + 1);
    const noteType = noteTypes.get(frontMatter.mid);
    if (!noteType) return;
    const fields = this.parseFields(file.basename, noteType, body);
    if (!fields) return;
    // now it is a valid Note
    const basename = file.basename;
    const folder = file.parent.path == '/' ? '' : file.parent.path;
    return new Note(basename, folder, noteType.name, frontMatter, fields);
  }

  parseFields(title: string, noteType: NoteTypeDigest, body: string[]) {
    const fieldNames = noteType.fieldNames;
    const headingLevel = this.settings.headingLevel;
    const isCloze = noteType.name === '填空题' || noteType.name === 'Cloze';
    const fieldContents: string[] = isCloze ? [] : [title];
    let buffer: string[] = [];
    for (const line of body) {
      if (line.slice(0, headingLevel + 1) === ('#'.repeat(headingLevel) + ' ')) {
        fieldContents.push(buffer.join('\n'));
        buffer = [];
      } else {
        buffer.push(line)
      }
    }
    fieldContents.push(buffer.join('\n'));
    if (fieldNames.length !== fieldContents.length) return;
    const fields: Record<string, string> = {};
    fieldNames.map((v, i) => fields[v] = fieldContents[i]);
    return fields;
  }

  dump(note: Note) {
    const frontMatter = stringifyYaml(Object.assign({
      mid: note.mid,
      nid: note.nid,
      tags: note.tags
    }, note.extras)).trim().replace(/"/g, ``);
    const fieldNames = Object.keys(note.fields);
    const lines = [`---`, frontMatter, `---`];
    if (note.isCloze()) {
      lines.push(note.fields[fieldNames[0]]);
      fieldNames.slice(1).map(s => {
        lines.push(`${'#'.repeat(this.settings.headingLevel)} ${s}`, note.fields[s]);
      });
    } else {
      lines.push(note.fields[fieldNames[1]]);
      fieldNames.slice(2).map(s => {
        lines.push(`${'#'.repeat(this.settings.headingLevel)} ${s}`, note.fields[s]);
      });
    }
    return lines.join('\n');
  }
}
