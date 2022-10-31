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
  settingHeadingLevelName: string,
  settingHeadingLevelDescription: string,
}

const en: Locale = {
  onLoad: 'Note Synchronizer is successfully loaded!',
  onUnload: 'Note Synchronizer is successfully unloaded!',
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
  settingTabHeader: 'Note Synchronizer Settings',
  settingRenderName: 'Render',
  settingRenderDescription: 'Whether to render markdown before importing to Anki or not.',
  settingHeadingLevelName: 'Field name heading level',
  settingHeadingLevelDescription: 'Which level (h1, h2, h3, ...) to use for field names when generating the note template',
}

const zh_cn: Locale = {
  onLoad: '笔记同步插件已成功启用！',
  onUnload: '笔记同步插件已成功禁用！',
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
  settingTabHeader: '笔记同步设置',
  settingRenderName: '渲染',
  settingRenderDescription: '是否在导入时将 Markdown 渲染为 HTML',
  settingHeadingLevelName: '字段名称标题层级',
  settingHeadingLevelDescription: '从 Anki 笔记类型生成模板时，将 Anki 的字段名称表示为几级标题（一级、二级、三级等）',
}

const locales: { [k: string]: Partial<Locale> } = {
  en,
  'zh-cn': zh_cn,
}

const locale: Locale = Object.assign({}, en, locales[moment.locale()]);

export default locale;
