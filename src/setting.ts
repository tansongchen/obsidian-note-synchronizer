import { App, PluginSettingTab, Setting } from "obsidian";
import { locale } from 'src/lang';
import AnkiSynchronizer from "main";

// Plugin Settings
export interface Settings {
    render: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    render: false,
}

export default class AnkiSynchronizerSettingTab extends PluginSettingTab {
    plugin: AnkiSynchronizer;

    constructor(app: App, plugin: AnkiSynchronizer) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: locale.settingTabHeader});

        new Setting(containerEl)
            .setName(locale.settingRenderName)
            .setDesc(locale.settingRenderDescription)
            .addToggle(v => v
                .setValue(this.plugin.settings.render)
                .onChange(async (value) => {
                    this.plugin.settings.render = value;
                }));
    }
}
