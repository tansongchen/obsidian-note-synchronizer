import { moment } from "obsidian";

interface Locale {
  onLoad: string,
  onUnload: string,
  synchronizeCommandName: string,
  templatesNotEnabledNotice: string,
  importCommandName: string,
  importStartNotice: string,
  importSuccessNotice: string,
  importFailureNotice: string,
  synchronizeStartNotice: string,
  synchronizeSuccessNotice: string,
  synchronizeBadAnkiConnectNotice: string,
  synchronizeAnkiConnectUnavailableNotice: string,
  synchronizeAddNoteFailureNotice: (filename: string) => string,
  synchronizeChangeDeckFailureNotice: (filename: string) => string,
  synchronizeUpdateFieldsFailureNotice: (filename: string) => string,
  synchronizeUpdateTagsFailureNotice: (filename: string) => string,
  settingTabHeader: string,
  settingRenderName: string,
  settingRenderDescription: string,
}

const en: Locale = {
  onLoad: 'Anki Synchronizer is successfully loaded!',
  onUnload: 'Anki Synchronizer is successfully unloaded!',
  synchronizeCommandName: 'Synchronize',
  templatesNotEnabledNotice: 'Core plugin Templates is not enabled!',
  importCommandName: 'Import Note Types',
  importStartNotice: 'Importing note types from Anki...',
  importSuccessNotice: 'Successfully imported note types from Anki!',
  importFailureNotice: 'Cannot import note types from Anki!',
  synchronizeStartNotice: 'Synchronizing to Anki...',
  synchronizeSuccessNotice: 'Successfully synchronized to Anki!',
  synchronizeBadAnkiConnectNotice: `Bad version of AnkiConnect`,
  synchronizeAnkiConnectUnavailableNotice: `Anki is not opened or AnkiConnect is not installed!`,
  synchronizeAddNoteFailureNotice: (s) => `Cannot add note for ${s}`,
  synchronizeChangeDeckFailureNotice: (filename: string) => `Cannot change deck for ${filename}`,
  synchronizeUpdateFieldsFailureNotice: (filename: string) => `Cannot update fields for ${filename}`,
  synchronizeUpdateTagsFailureNotice: (filename: string) => `Cannot update tags for ${filename}`,
  settingTabHeader: 'Anki Synchronizer Settings',
  settingRenderName: 'Render',
  settingRenderDescription: 'Whether to render markdown before importing to Anki or not.',
}

const zh_cn: Locale = {
  onLoad: 'Anki 同步插件已成功启用！',
  onUnload: 'Anki 同步插件已成功禁用！',
  synchronizeCommandName: '同步',
  templatesNotEnabledNotice: '核心插件「模板」未启用，操作无法执行！',
  importCommandName: '导入笔记类型',
  importStartNotice: '正在从 Anki 导入笔记类型……',
  importSuccessNotice: '已成功为 Anki 导入笔记类型！',
  importFailureNotice: '无法从 Anki 导入笔记类型！',
  synchronizeStartNotice: '正在与 Anki 同步笔记……',
  synchronizeSuccessNotice: '已成功与 Anki 同步笔记！',
  synchronizeBadAnkiConnectNotice: 'Anki Connect 版本不匹配！',
  synchronizeAnkiConnectUnavailableNotice: 'Anki 未打开或 Anki Connect 未安装！',
  synchronizeAddNoteFailureNotice: (s) => `无法向 Anki 添加笔记 ${s}`,
  synchronizeChangeDeckFailureNotice: (filename: string) => `无法改变 ${filename} 的牌组`,
  synchronizeUpdateFieldsFailureNotice: (filename: string) => `无法更新 ${filename} 的字段`,
  synchronizeUpdateTagsFailureNotice: (filename: string) => `无法更新 ${filename} 的标签`,
  settingTabHeader: 'Anki 同步设置',
  settingRenderName: '渲染',
  settingRenderDescription: '是否在导入时将 Markdown 渲染为 HTML'
}

const locales: { [k: string]: Partial<Locale> } = {
  en,
  'zh-cn': zh_cn,
}

const locale: Locale = Object.assign({}, en, locales[moment.locale()]);

export default locale;
