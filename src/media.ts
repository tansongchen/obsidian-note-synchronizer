import { EmbedCache, MetadataCache, Vault, parseLinktext } from 'obsidian';
import path from 'path';


export default class Media {
  filename: string;
  path: string;
  deleteExisting: boolean;

  constructor(filename: string, path: string, deleteExisting = false) {
    this.filename = filename;
    this.path = path;
    this.deleteExisting = deleteExisting;
  }
}

export class MediaManager {
  parseMedia(item: EmbedCache, vault: Vault, metadataCache: MetadataCache) {
    const file_path = parseLinktext(item.link.replace(/(\.\/)|(\.\.\/)+/g, '')).path;
    let mediaFile = vault.getAbstractFileByPath(
      parseLinktext(item.link.replace(/(\.\/)|(\.\.\/)+/g, '')).path
    );
    if (!mediaFile) mediaFile = metadataCache.getFirstLinkpathDest(file_path, file_path);

    // @ts-ignore
    const mediaAbsPath = vault.adapter.basePath + path.sep + mediaFile?.path.replace('/', path.sep);
    const mediaName = item.link.split('/').pop() as string;

    return new Media(mediaName, mediaAbsPath);
  }
}
