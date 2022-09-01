import axios, { AxiosResponse } from "axios";
import { Notice } from "obsidian";
import locale from "./lang";

interface Request<P = undefined> {
  action: string,
  version: number,
  params: P
}

interface Response<R = null> {
  error: string | null,
  result: R
}

export class AnkiError extends Error {}

export interface Note {
  deckName: string,
  modelName: string,
  fields: Record<string, string>,
  options?: {
    allowDuplicate: boolean,
    duplicateScope: string
  }
  tags: Array<string>,
}

class Anki {
  private port = 8765;

  async invoke<R = null, P = undefined>(action: string, params: P): Promise<R | AnkiError> {
    type requestType = Request<P>;
    type responseType = Response<R>;
    const request = {
      action: action,
      version: 6,
      params: params
    };
    try {
      const { data } = (await axios.post<responseType, AxiosResponse<responseType, requestType>, requestType>(`http://127.0.0.1:${this.port}`, request));
      if (data.error !== null) {
        return new AnkiError(data.error);
      }
      return data.result;
    } catch (error) {
      new Notice(locale.synchronizeAnkiConnectUnavailableNotice);
      throw error;
    }
  }

  async version() {
    return this.invoke<number>('version', undefined);
  }

  async noteTypes() {
    return this.invoke<string[]>('modelNames', undefined);
  }

  async noteTypesAndIds() {
    return this.invoke<Record<string, number>>('modelNamesAndIds', undefined);
  }

  async fields(noteType: string) {
    return this.invoke<string[], { modelName: string }>('modelFieldNames', {
      modelName: noteType
    })
  }

  async addNote(note: Note) {
    return this.invoke<number, { note: Note }>('addNote', {
      note: note
    });
  }

  async updateFields(id: number, fields: Record<string, string>) {
    return this.invoke('updateNoteFields', {
      'note': {
        id: id,
        fields: fields
      }
    });
  }

  async addTagsToNotes(noteIds: number[], tags: string[]) {
    const tagstring = tags.join(' ');
    return this.invoke('addTags', {
      'notes': noteIds,
      'tags': tagstring
    })
  }

  async removeTagsFromNotes(noteIds: number[], tags: string[]) {
    const tagstring = tags.join(' ');
    return this.invoke('removeTags', {
      'notes': noteIds,
      'tags': tagstring
    })
  }

  async changeDeck(cardIds: number[], deck: string) {
    return this.invoke('changeDeck', {
      'cards': cardIds,
      'deck': deck
    })
  }

  async deleteNotes(noteIds: number[]) {
    return this.invoke('deleteNotes', {
      'notes': noteIds
    })
  }

  async notesInfo(noteIds: number[]) {
    return this.invoke<{ cards: number[] }[], { notes: number[] }>('notesInfo', {
      notes: noteIds
    })
  }

  async createDeck(deckName: string) {
    return this.invoke('createDeck', {
      deck: deckName
    })
  }

  async multi<P, R>(actionName: string, actionList: P[]) {
    return this.invoke<R[], { actions: Omit<Request<P>, 'version'>[] }>('multi', {
      actions: actionList.map(params => ({
        action: actionName,
        params: params
      }))
    });
  }
}

export default Anki;
