import { stringifyYaml, FrontMatterCache } from "obsidian";
import { NoteDigest, NoteTypeDigest } from "./state";
import { MD5 } from 'object-hash';

export interface FrontMatter {
  mid: number,
  nid: number,
  tags: string[]
}

export default class Note {
  nid: number;
  tags: string[];
  fields: Record<string, string>;
  private path: string;
  typeName: string;
  private mid: number;
  private extras: object;

  static validateNote(path: string, frontmatter: FrontMatterCache, content: string, noteTypes: Map<number, NoteTypeDigest>) {
    if (!frontmatter.hasOwnProperty('mid') || !frontmatter.hasOwnProperty('nid') || !frontmatter.hasOwnProperty('tags')) return;
    const frontMatter = Object.assign({}, frontmatter, { position: undefined }) as FrontMatter;
    const lines = content.split('\n');
    const yamlEndIndex = lines.indexOf('---', 1);
    const body = lines.slice(yamlEndIndex + 1);
    const noteType = noteTypes.get(frontMatter.mid);
    if (!noteType) return;
    const fields = Note.parseFields(path, noteType.fieldNames, body);
    // now it is a valid Note
    return new Note(path, noteType.name, frontMatter, fields);
  }

  static parseFields(path: string, fieldNames: string[], body: string[]) {
    const pathList = path.split('/');
    const baseName = pathList[pathList.length - 1];
    const fieldContents: string[] = [baseName.split('.').slice(0, -1).join('')];
    let buffer: string[] = [];
    for (const line of body) {
      if (line.slice(0, 2) === '# ') {
        fieldContents.push(buffer.join('\n'));
        buffer = [];
      } else {
        buffer.push(line)
      }
    }
    fieldContents.push(buffer.join('\n'));
    const fields: Record<string, string> = {};
    fieldNames.map((v, i) => fields[v] = fieldContents[i]);
    return fields;
  }

  constructor(path: string, typeName: string, frontMatter: FrontMatter, fields: Record<string, string>) {
    this.path = path;
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
    return Object.values(this.fields)[0];
  }

  dump() {
    const frontMatter = stringifyYaml(Object.assign({
      mid: this.mid,
      nid: this.nid,
      tags: this.tags
    }, this.extras)).trim().replace(/"/g, ``);
    const fieldNames = Object.keys(this.fields);
    const lines = [`---`, frontMatter, `---`, this.fields[fieldNames[1]]];
    fieldNames.slice(2).map(s => {
      lines.push(`# ${s}`, this.fields[s]);
    });
    return lines.join('\n');
  }

  renderDeckName() {
    return this.path.split('/').slice(0, -1).join('::') || 'Obsidian';
  }
}
