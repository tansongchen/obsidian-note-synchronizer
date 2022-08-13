# Obsidian Anki 同步

## 特性

- 支持任意 Anki 笔记类型，可将 Anki 的笔记类型导入为 Obsidian 笔记模板
- Anki 笔记与 Obsidian 笔记一一对应，Anki 牌组与 Obsidian 文件夹一一对应，Anki 标签与 Obsidian 标签一一对应
- 导入 Anki 时将 Obsidian 链接转换为 Markdown 链接，方便卡片学习时跳转

本插件有两种工作模式：

- Markdown 模式：将 Markdown 文本原封不动导入 Anki，需要使用 [Markdown and KaTeX Support](https://ankiweb.net/shared/info/1087328706) 或类似插件自行配置 Anki 中的实时 Markdown 渲染；
- HTML 模式：将 Markdown 渲染成 HTML 之后导入 Anki。

## 安装

本插件目前处于 Alpha 阶段，所以还没有在 Obsidian 插件市场发布。您需要手动安装此插件。

在[发布页](https://github.com/tansongchen/obsidian-anki-synchronizer/releases)下载 `dist.zip` 文件，然后在您的知识库目录下面的 `.obsidian/plugins` 新建一个文件夹 `obsidian-anki-synchronizer`，然后把解压得到的三个文件放进去。重启 Obsidian。

例如，我这里的目录是 `/Users/tansongchen/Library/Mobile Documents/iCloud~md~obsidian/Documents/卡片盒/.obsidian/plugins/obsidian-anki-synchronizer`。

## 使用

使用前需要首先打开核心插件中的「模板」插件。

### 提取模板

首次安装后运行命令「导入笔记类型」，会提取 Anki 中所有的笔记类型到当前知识库的模板目录下，对每个笔记类型生成一个模板文件。所有模板文件都有这样的 YAML 前言：

```yaml
type: 问答题
id: 0
tags: []
date: {{date}} {{time}}
```

其中 `type` 是 Anki 笔记类型的名字。如果这个笔记类型有三个或更多的字段，那么第三个及以后的字段名称会以一级标题的形式出现在正文。例如，如果笔记类型「费曼笔记」的字段是「概念、定义、实例、类比、备注」，则生成的模板文件形如：

```markdown
---
type: 费曼笔记
id: 0
tags: []
date: {{date}} {{time}}
---



# 实例



# 类比、比较与对比



# 备注


```

### 编辑笔记

使用本插件生成的模板文件创建一个新笔记时，请将笔记的第一个字段写在文件名中（第一个字段一般是概念名称），然后第二个字段写在 YAML 前言的后面，第三个及之后的字段写在相应的一级标题下。

笔记所在的文件夹默认是你希望卡片所在的牌组，例如 `/学习/笔记.md` 将会被同步到 Anki 的 `学习` 牌组中，`/学习/项目 1/笔记.md` 将会被同步到 Anki 的 `学习::项目 1` 牌组中。

### 同步笔记

运行命令「同步」。如果没有按照预想的生成 Anki 中的笔记，请打开调试控制台并向作者报告控制台中的输出。
