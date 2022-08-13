import { moment } from "obsidian";

interface Locale {
	onLoad: string,
	onUnload: string,
	synchronizeCommandName: string,
	importCommandName: string,
	importStartNotice: string,
	importSuccessNotice: string,
	synchronizeStartNotice: string,
	synchronizeSuccessNotice: string,
	synchronizeBadAnkiConnectNotice: string,
	synchronizeAnkiConnectUnavailableNotice: string,
	settingTabHeader: string,
	settingRenderName: string,
	settingRenderDescription: string,
}

const en: Locale = {
	onLoad: 'Anki Synchronizer is successfully loaded!',
	onUnload: 'Anki Synchronizer is successfully unloaded!',
	synchronizeCommandName: 'Synchronize',
	importCommandName: 'Import Note Types',
	importStartNotice: 'Importing note types from Anki...',
	importSuccessNotice: 'Successfully imported note types from Anki!',
	synchronizeStartNotice: 'Synchronizing to Anki...',
	synchronizeSuccessNotice: 'Successfully synchronized to Anki!',
	synchronizeBadAnkiConnectNotice: `Bad version of AnkiConnect`,
	synchronizeAnkiConnectUnavailableNotice: `AnkiConnect is not enabled!`,
	settingTabHeader: 'Anki Synchronizer Settings',
	settingRenderName: 'Render',
	settingRenderDescription: 'Whether to render markdown before importing to Anki or not.',
}

const zh_cn: Locale = {
	onLoad: 'Anki 同步插件已成功启用！',
	onUnload: 'Anki 同步插件已成功禁用！',
	synchronizeCommandName: '同步',
	importCommandName: '导入笔记类型',
	importStartNotice: '正在从 Anki 导入笔记类型……',
	importSuccessNotice: '已成功为 Anki 导入笔记类型！',
	synchronizeStartNotice: '正在与 Anki 同步笔记……',
	synchronizeSuccessNotice: '已成功与 Anki 同步笔记！',
	synchronizeBadAnkiConnectNotice: 'Anki Connect 版本不匹配！',
	synchronizeAnkiConnectUnavailableNotice: 'Anki Connect 不可用！',
	settingTabHeader: 'Anki 同步设置',
	settingRenderName: '渲染',
	settingRenderDescription: '是否在导入时将 Markdown 渲染为 HTML'
}

const locales: { [k: string]: Partial<Locale> } = {
	en,
	'zh-cn': zh_cn,
}

export const locale: Locale = Object.assign({}, en, locales[moment.locale()]);
