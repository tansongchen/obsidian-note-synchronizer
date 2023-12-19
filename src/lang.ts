import { moment } from 'obsidian';

interface Locale {
  onLoad: string;
  onUnload: string;
  synchronizeCommandName: string;
  templatesNotEnabledNotice: string;
  templatesFolderUndefinedNotice: string;
  importCommandName: string;
  importStartNotice: string;
  importSuccessNotice: string;
  importFailureNotice: string;
  synchronizeStartNotice: string;
  synchronizeSuccessNotice: string;
  synchronizeBadAnkiConnectNotice: string;
  synchronizeAnkiConnectUnavailableNotice: string;
  synchronizeAddNoteFailureNotice: (title: string) => string;
  synchronizeChangeDeckFailureNotice: (title: string) => string;
  synchronizeUpdateFieldsFailureNotice: (title: string) => string;
  synchronizeUpdateTagsFailureNotice: (title: string) => string;
  settingTabHeader: string;
  settingRenderName: string;
  settingRenderDescription: string;
  settingLinkifyName: string;
  settingLinkifyDescription: string;
  settingHighlightAsClozeName: string;
  settingHighlightAsClozeDescription: string;
  settingHeadingLevelName: string;
  settingHeadingLevelDescription: string;
  settingRubberIconSyncName: string;
  settingRubberIconSyncDescription: string;
  settingRubberIconImportName: string;
  settingRubberIconImportDescription: string;
  settingTimerName: string;
  settingTimerDescription: string;
}

const en: Locale = {
  onLoad: 'Note Synchronizer is successfully loaded!',
  onUnload: 'Note Synchronizer is successfully unloaded!',
  synchronizeCommandName: 'Synchronize',
  templatesNotEnabledNotice: 'Core plugin Templates is not enabled!',
  templatesFolderUndefinedNotice: 'Templates folder is undefined!',
  importCommandName: 'Import Note Types',
  importStartNotice: 'Importing note types from Anki...',
  importSuccessNotice: 'Successfully imported note types from Anki!',
  importFailureNotice: 'Cannot import note types from Anki!',
  synchronizeStartNotice: 'Synchronizing to Anki...',
  synchronizeSuccessNotice: 'Successfully synchronized to Anki!',
  synchronizeBadAnkiConnectNotice: `Bad version of AnkiConnect`,
  synchronizeAnkiConnectUnavailableNotice: `Anki is not opened or AnkiConnect is not installed!`,
  synchronizeAddNoteFailureNotice: (title: string) => `Cannot add note for ${title}`,
  synchronizeChangeDeckFailureNotice: (title: string) => `Cannot change deck for ${title}`,
  synchronizeUpdateFieldsFailureNotice: (title: string) => `Cannot update fields for ${title}`,
  synchronizeUpdateTagsFailureNotice: (title: string) => `Cannot update tags for ${title}`,
  settingTabHeader: 'Note Synchronizer Settings',
  settingRenderName: 'Render',
  settingRenderDescription: 'Whether to render markdown before importing to Anki or not.',
  settingLinkifyName: 'Linkify',
  settingLinkifyDescription: 'Whether to linkify the Obsidian title',
  settingHighlightAsClozeName: 'Highlight as Cloze',
  settingHighlightAsClozeDescription: 'Enable using Obsidian highlights (==...==) for Anki clozes',
  settingHeadingLevelName: 'Field name heading level',
  settingHeadingLevelDescription:
    'Which level (h1, h2, h3, ...) to use for field names when generating the note template',
  settingRubberIconSyncName: 'Sync Icon',
  settingRubberIconSyncDescription: 'Toggle Sync Icon on the menu (the change will be visible after a reload)',
  settingRubberIconImportName: 'Import Icon',
  settingRubberIconImportDescription: 'Toggle Import Icon on the menu (the change will be visible after a reload)',
  settingTimerName: 'Auto Sync',
  settingTimerDescription: 'Set 0 to no set no auto sync, else set the number of minute to wait before the auto sync.',
};

const zh_cn: Locale = {
  settingRubberIconSyncName: '同步图标' ,
  settingRubberIconSyncDescription: '在菜单上切换同步图标（更改后需重新加载后可见）' ,
  settingRubberIconImportName: '导入图标' ,
  settingRubberIconImportDescription: '在菜单上切换导入图标（更改后需重新加载后可见）' ,
  settingTimerName: '自动同步', 
  settingTimerDescription: '设置为0则不进行自动同步，否则设置自动同步前等待的分钟数。' ,
  onLoad: '笔记同步插件已成功启用！',
  onUnload: '笔记同步插件已成功禁用！',
  synchronizeCommandName: '同步',
  templatesNotEnabledNotice: '核心插件「模板」未启用，操作无法执行！',
  templatesFolderUndefinedNotice: '核心插件「模板」尚未配置模板文件夹位置，操作无法执行！',
  importCommandName: '导入笔记类型',
  importStartNotice: '正在从 Anki 导入笔记类型……',
  importSuccessNotice: '已成功为 Anki 导入笔记类型！',
  importFailureNotice: '无法从 Anki 导入笔记类型！',
  synchronizeStartNotice: '正在与 Anki 同步笔记……',
  synchronizeSuccessNotice: '已成功与 Anki 同步笔记！',
  synchronizeBadAnkiConnectNotice: 'Anki Connect 版本不匹配！',
  synchronizeAnkiConnectUnavailableNotice: 'Anki 未打开或 Anki Connect 未安装！',
  synchronizeAddNoteFailureNotice: (title: string) => `无法添加笔记「${title}」`,
  synchronizeChangeDeckFailureNotice: (title: string) => `无法改变笔记「${title}」的牌组`,
  synchronizeUpdateFieldsFailureNotice: (title: string) => `无法更新笔记「${title}」的字段`,
  synchronizeUpdateTagsFailureNotice: (title: string) => `无法更新笔记「${title}」的标签`,
  settingTabHeader: '笔记同步设置',
  settingRenderName: '渲染',
  settingRenderDescription: '是否在导入时将 Markdown 渲染为 HTML',
  settingLinkifyName: '回链',
  settingLinkifyDescription: '是否将标题字段加上返回 Obsidian 的链接',
  settingHighlightAsClozeName: '将高亮用作 Anki 填空题',
  settingHighlightAsClozeDescription: '启用将 Obsidian 高亮的文本转换为 Anki 填空',
  settingHeadingLevelName: '字段名称标题层级',
  settingHeadingLevelDescription:
    '从 Anki 笔记类型生成模板时，将 Anki 的字段名称表示为几级标题（一级、二级、三级等）'
};

const locales: { [k: string]: Partial<Locale> } = {
  en,
  'zh-cn': zh_cn
};

const locale: Locale = Object.assign({}, en, locales[moment.locale()]);

export default locale;
