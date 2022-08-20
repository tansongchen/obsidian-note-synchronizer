import AnkiSynchronizer from "main";
import { Settings } from "./setting";
import MarkdownIt from "markdown-it";

export class Formatter {
  settings: Settings;
  mdit = new MarkdownIt();
  vaultName: string;

  constructor(plugin: AnkiSynchronizer) {
    this.vaultName = plugin.app.vault.getName();
    this.settings = plugin.settings;
  }

  renderBacklink = (basename: string) => {
    const url = "obsidian://open?vault=" + encodeURIComponent(this.vaultName) + String.raw`&file=` + encodeURIComponent(basename);
    return `[${basename}](${url})`
  }

  markdown(markup: string) {
    return markup.replace(/\[\[(\w+)\]\]/, (match, p) => {
      const backlink = this.renderBacklink(p);
      return `[${p}](${backlink})`
    });
  }

  html(markdown: string) {
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
