import { Settings } from "./setting";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

export default class Formatter {
  private settings: Settings;
  private mdit = new MarkdownIt({
    html: true,
    linkify: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch (__) {
          return '';
        }
      }
      return '';
    }
  });
  private vaultName: string;

  constructor(vaultName: string, settings: Settings) {
    this.vaultName = vaultName;
    this.settings = settings;
  }

  renderBacklink = (basename: string) => {
    const url = `obsidian://open?vault=${encodeURIComponent(this.vaultName)}&file=${encodeURIComponent(basename)}`;
    return `[${basename}](${url})`
  }

  markdown(markup: string) {
    return markup.replace(/!?\[\[(.+?)\]\]/g, (match, p) => {
      return this.renderBacklink(p);
    });
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
