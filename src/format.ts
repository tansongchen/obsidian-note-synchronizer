import { Settings } from "./setting";
import MarkdownIt from "markdown-it";
import highlightjs from "markdown-it-highlightjs";

export default class Formatter {
  private settings: Settings;
  private mdit = new MarkdownIt({
    html: true,
    linkify: true,
  }).use(highlightjs);
  private vaultName: string;

  constructor(vaultName: string, settings: Settings) {
    this.vaultName = vaultName;
    this.settings = settings;
  }

  convertWikilink(markup: string) {
    return markup.replace(/!?\[\[(.+?)\]\]/g, (match, basename) => {
      const url = `obsidian://open?vault=${encodeURIComponent(this.vaultName)}&file=${encodeURIComponent(basename)}`;
      return `[${basename}](${url})`;
    })
  }

  convertHighlightToCloze(markup: string) {
    let index = 0;
    while (markup.match(/==(.+?)==/) !== null) {
      index += 1;
      markup = markup.replace(/==(.+?)==/, (match, content) => {
        return `{{c${index}::${content}}}`
      });
    }
    return markup;
  }

  markdown(markup: string) {
    markup = this.convertWikilink(markup);
    markup = this.convertHighlightToCloze(markup);
    return markup;
  }

  convertMathDelimiter(markdown: string) {
    markdown = markdown.replace(/\$(.+?)\$/g, '\\\\($1\\\\)');
    markdown = markdown.replace(/\$\$(.+?)\$\$/gs, '\\\\[$1\\\\]');
    return markdown;
  }

  html(markdown: string) {
    markdown = this.convertMathDelimiter(markdown);
    return this.mdit.render(markdown);
  }

  format(fields: Record<string, string>) {
    const keys = Object.keys(fields);
    const result: Record<string, string> = {};
    keys.map((key, index) => {
      const field = index ? fields[key] : `[[${fields[key]}]]`;
      const markdown = this.markdown(field);
      result[key] = this.settings.render ? this.html(markdown) : markdown;
    });
    return result;
  }
}
