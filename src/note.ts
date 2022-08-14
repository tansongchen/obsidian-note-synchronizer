import { assert } from "console";
import { TFile, parseYaml, TAbstractFile, stringifyYaml } from "obsidian";

export interface FrontMatter {
    mid: number,
    nid: number,
    tags: string[]
}

export function getFrontMatterAndBody(raw: string): [object, string[]] {
    const lines = raw.split('\n');
    assert(lines.length >= 2 && lines[0].trim() == '---');
    let index = 1;
    while (lines[index].trim() !== '---') {
        index += 1;
        if (index == lines.length) {
            throw new Error("Bad YAML");
        }
    }
    const frontMatter = parseYaml(lines.slice(1, index).join('\n'));
    const body = lines.slice(index + 1);
    return [frontMatter, body]
}

export class Note {
    file: TFile;
    mid: number;
    nid: number;
    tags: string[];
    extras: object;
    fields: Record<string, string>;

    constructor(file: TFile, frontMatter: FrontMatter, body: string[], fieldNames: string[]) {
        this.file = file;
        const { mid, nid, tags, ...extras } = frontMatter;
        this.mid = mid;
        this.nid = nid;
        this.tags = tags;
        this.extras = extras;
        this.fields = this.parseFields(fieldNames, body);
    }

    dump() {
        const frontMatter = stringifyYaml(Object.assign({
            mid: this.mid,
            nid: this.nid || 0,
            tags: this.tags
        }, this.extras));
        const fieldNames = Object.keys(this.fields);
        const frontMatterString = `---\n${frontMatter}---\n`;
        return frontMatterString + this.fields[fieldNames[1]] + fieldNames.slice(2).map(s => `\n# ${s}\n${this.fields[s]}`).join('');
    }

    parseFields(fieldNames: string[], body: string[]) {
        const fieldContents: string[] = [this.file.basename];
        let buffer: Array<string> = [];
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

    renderDeckName() {
        return (this.file as TAbstractFile).path.split('/').slice(0, -1).join('::') || 'Obsidian';
    }
}
