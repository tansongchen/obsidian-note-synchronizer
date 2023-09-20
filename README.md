# Obsidian Anki Synchronizer

See Chinese README [here](README.zh.md).

## Features

- Support arbitrary Anki note type by importing Anki note types as Obsidian note templates
- 1:1 correspondence between Anki notes and Obsidian notes, Anki decks and Obsidian folders, Anki tags and Obsidian tags
- Converting Obsidian wikilinks to Markdown links (Obsidian URL)

The plugin works in two modes:

- Markdown mode: importing markdown content into Anki as-is, without rendering into HTML. In order to view rendered content in Anki, you need [Markdown and KaTeX Support](https://ankiweb.net/shared/info/1087328706) or similar Anki plugins to get real-time rendering.
- HTML mode: importing rendered HTML into Anki.

## Installation

Install via the Obsidian community plugin marketplace by searching "Note Synchronizer".

## Setup

Before running this plugin, make sure that the following requirements are met:

### Enable Obsidian plugin "Templates"

This plugin depends on the core plugin "Templates". You need to enable it for this plugin to work. Go to the Obsidian settings "Core Plugins" tab and enable "Templates".

### Install and configure Anki Connect

Install [Anki Connect](https://ankiweb.net/shared/info/2055492159) in the same way as other Anki plugins. After installation, navigate to `Tools -> Addons -> AnkiConnect -> Config`, paste the following text:

```json
{
  "apiKey": null,
  "apiLogPath": null,
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOrigin": "http://localhost",
  "webCorsOriginList": ["http://localhost", "app://obsidian.md"]
}
```

### Restart Anki and navigate to the desired profile

Restart Anki and select the profile you want to sync with Obsidian. Right now, you can only select one Anki profile to sync with obsidian.

## Usage

### Import Note Types

Run command `Import Note Types` to import all available note types in Anki to the template folder in the current vault, generating a template markdown file for each of the note types. All template markdown files generated have some YAML front matter like this:

```yaml
mid: 16xxxxxxxxxxx
nid: 0
tags: []
date: {{date}} {{time}}
```

Where `mid` is a number representing the note type ID in Anki. If this note type happen to have 3 or more fields, the third field and all other fields after that will appear as `h1` title in the markdown file.

### Header

The default header of non Cloze card, is the file name of the card.
If `header` propriety is defined then this would be the new header.

### Edit Notes

When creating notes with generated template files, please write the content of the first field into the filename, and the second field right after the YAML front matter, and other fields below their corresponding `h1` title.

The way that notes are organized in Obsidian will be mirrored in Anki using decks. For example, the file `/learning/note.md` will be synced to the `learning` deck in Anki, and the file `/learning/project 1/note.md` will be synced to `learning::project 1` deck in Anki. Toplevel files will be synced to a special deck `Obsidian`. If the supposed deck doesn't exist in Anki, it will be created.

### Synchonize notes

Run command `Synchronize`. If unexpected behavior happens, please toggle the developer console and report the output there.

