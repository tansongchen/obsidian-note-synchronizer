import { Settings } from './setting';
import MarkdownIt from 'markdown-it';
import highlightjs from 'markdown-it-highlightjs';
import Note from './note';

export default class Formatter {
  private settings: Settings;
  private mdit = new MarkdownIt({
    html: true,
    linkify: true
  }).use(highlightjs);
  private vaultName: string;

  constructor(vaultName: string, settings: Settings) {
    this.vaultName = vaultName;
    this.settings = settings;
  }

  convertWikilink(markup: string) {
    return markup.replace(/!?\[\[(.+?)\]\]/g, (_, basename) => {
      let title = basename;
      if (basename.includes('|')) {
        const split = basename.split('|');
        basename = split[0];
        title = split[1];
      }
      const url = `obsidian://open?vault=${encodeURIComponent(
        this.vaultName
      )}&file=${encodeURIComponent(basename)}`;
      // wikilinks if there is a [[page|title]] report only the title
      return `[${title}](${url})`;
    });
  }

  convertHighlightToCloze(markup: string) {
    let index = 0;
    while (markup.match(/==(.+?)==/) !== null) {
      index += 1;
      markup = markup.replace(/==(.+?)==/, (_, content) => {
        return `{{c${index}::${content}}}`;
      });
    }
    return markup;
  }

  markdown(markup: string) {
    markup = this.convertWikilink(markup);
    if (this.settings.highlightAsCloze) {
      markup = this.convertHighlightToCloze(markup);
    }
    return markup;
  }

  convertMathDelimiter(markdown: string) {
    markdown = markdown.replace(/\$(.+?)\$/g, '\\\\($1\\\\)');
    markdown = markdown.replace(/\$\$(.+?)\$\$/gs, '\\\\[$1\\\\]');
    return markdown;
  }

  html(markdown: string, index: number) {
    markdown = this.convertMathDelimiter(markdown);
    return index == 0 ? this.mdit.renderInline(markdown) : this.mdit.render(markdown);
  }

  format(note: Note) {
    const fields = note.fields;
    const keys = Object.keys(fields);
    const result: Record<string, string> = {};
    keys.map((key, index) => {
      const markdown = this.markdown(fields[key]);
      result[key] = this.settings.render ? this.html(markdown, index) : markdown;
    });
    return result;
  }
}
