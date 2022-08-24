import { Settings } from "./setting";
import MarkdownIt from "markdown-it";

export default class Formatter {
  private settings: Settings;
  private mdit = new MarkdownIt();
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
    return markup.replace(/\[\[(.+)\]\]/, (match, p) => {
      return this.renderBacklink(p);
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
