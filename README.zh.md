# Obsidian Anki 同步

## 特性

- 支持任意 Anki 笔记类型，可将 Anki 的笔记类型导入为 Obsidian 笔记模板
- Anki 笔记与 Obsidian 笔记一一对应，Anki 牌组与 Obsidian 文件夹一一对应，Anki 标签与 Obsidian 标签一一对应
- 导入 Anki 时将 Obsidian 链接转换为 Markdown 链接，方便卡片学习时跳转

本插件有两种工作模式：

- Markdown 模式：将 Markdown 文本原封不动导入 Anki，需要使用 [Markdown and KaTeX Support](https://ankiweb.net/shared/info/1087328706) 或类似插件自行配置 Anki 中的实时 Markdown 渲染；
- HTML 模式：将 Markdown 渲染成 HTML 之后导入 Anki。

## 安装

在 Obsidian 插件市场中搜索「Note Synchronizer」并根据提示安装即可。

## 配置

在运行本插件之前，您需要确定您的环境满足以下要求：

### 启用 Obsidian 核心插件「模板」

本插件依赖于核心插件「模板」来确定应该将 Anki 笔记模板生成到哪个文件夹中。您需要在 Obsidian 设置页面的「核心插件」选项中启用「模板」。
### 安装并配置 Anki Connect

像其他 Anki 插件一样安装 [Anki Connect](https://ankiweb.net/shared/info/2055492159)。安装完成后，在「工具 - 插件 - Anki Connect - 配置」中粘贴以下文本：

```json
{
    "apiKey": null,
    "apiLogPath": null,
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOrigin": "http://localhost",
    "webCorsOriginList": [
        "http://localhost",
        "app://obsidian.md"
    ]
}
```

### Anki 处于打开状态并切换到需要同步的 Anki 用户

重启 Anki，选取您希望与 Obsidian 同步的用户并进入。目前您只能选择将 Obsidian 笔记同步到一个 Anki 用户的资料中，请确保您每次使用本插件时 Anki 打开的都是同一用户。

## 使用

### 提取模板

首次安装后运行命令「导入笔记类型」，会提取 Anki 中所有的笔记类型到当前知识库的模板目录下，对每个笔记类型生成一个模板文件。所有模板文件都有这样的 YAML 前言：

```yaml
mid: 16xxxxxxxxxxx
nid: 0
tags: []
date: {{date}} {{time}}
```

其中 `mid` 是一个以 16 开头的数字表示 Anki 笔记类型的 ID。如果这个笔记类型有三个或更多的字段，那么第三个及以后的字段名称会以一级标题的形式出现在正文。例如，如果笔记类型「费曼笔记」的字段是「概念、定义、实例、类比、备注」，则生成的模板文件形如：

```markdown
---
mid: 1654893531468
nid: 0
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

### 填空题的特殊处理

插件版本 v0.1.2 以上可以用 Obsidian 的高亮语法 `==content==` 来标注笔记中需要填空的内容，使其可以用于制作 Anki 的填空题笔记。要使用这个功能，首先要在设置中打开「将高亮用作 Anki 填空题」这个选项。此外，在 Anki 中已有的填空题笔记类型的名字必须为「填空题」或者「Cloze」，否则无法识别出来作特殊处理。

由于填空题一般主要内容都填写在第一个字段中，没有类似于「概念」、「标题」、「主题」等可以作为索引（即文件名）的字段，所以需要对填空题作特殊处理。导入笔记模板时，第二个及以后（而非第三个及以后）的字段会以一级标题的形式出现在正文。而在编辑笔记时，请将第一个字段写在 YAML 前言的后面，第二个及以后的字段写在相应的一级标题下。例如，以下笔记内容

```markdown
---
mid: 1670708523483
nid: 1673705987889
tags: []
date: 2023-01-14 09:15
---

这是==需要记忆==的内容。

# 背面额外


```

会被制作为第一字段为「这是{{c1::需要记忆}}的内容。」、第二字段为空的 Anki 填空题笔记。

### 同步笔记

运行命令「同步」。如果没有按照预想的生成 Anki 中的笔记，请打开调试控制台并向作者报告控制台中的输出。
