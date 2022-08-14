import axios, { AxiosResponse } from "axios";
import { Notice } from "obsidian";
import { locale } from "./lang";

interface Request<P = undefined> {
    action: string,
    version: number,
    params: P
}

interface Response<R = null> {
    error: string | null,
    result: R
}

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
    port = 8765;

    async invoke<P, R = null>(action: string, params: P) {
        type requestType = Request<P>;
        type responseType = Response<R>;
        const request = {
            action: action,
            version: 6,
            params: params
        };
        let data: responseType;
        try {
            data = (await axios.post<responseType, AxiosResponse<responseType, requestType>, requestType>(`http://127.0.0.1:${this.port}`, request)).data;
        } catch (error) {
            new Notice(locale.synchronizeAnkiConnectUnavailableNotice);
        }
        if (data.error) {
            throw data.error;
        }
        return data.result;
    }

    async version() {
        return this.invoke<undefined, number>('version', undefined);
    }

    async noteTypes() {
        return this.invoke<undefined, string[]>('modelNames', undefined);
    }

    async noteTypesAndIds() {
        return this.invoke<undefined, Record<string, number>>('modelNamesAndIds', undefined);
    }

    async fields(noteType: string) {
        return this.invoke<{modelName: string}, string[]>('modelFieldNames', {
            modelName: noteType
        })
    }

    async addNote(note: Note) {
        return this.invoke<{note: Note}, number>('addNote', {
            note: note
        });
    }

    async updateFields(id: number, fields: Record<string, string>) {
        return this.invoke<{note: {id: number, fields: Record<string, string>}}>('updateNoteFields', {
            'note': {
                id: id,
                fields: fields
            }
        });
    }

    async addTagsToNotes(noteIds: Array<number>, tags: Array<string>) {
        const tagstring = tags.join(' ');
        return this.invoke<{notes: Array<number>, tags: string}>('addTags', {
            'notes': noteIds,
            'tags': tagstring
        })
    }

    async removeTagsFromNotes(noteIds: Array<number>, tags: Array<string>) {
        const tagstring = tags.join(' ');
        return this.invoke<{notes: Array<number>, tags: string}>('removeTags', {
            'notes': noteIds,
            'tags': tagstring
        })
    }

    async changeDeck(cardIds: Array<number>, deck: string) {
        return this.invoke<{cards: Array<number>, deck: string}>('changeDeck', {
            'cards': cardIds,
            'deck': deck
        })
    }

    async deleteNotes(noteIds: number[]) {
        return this.invoke<{notes: number[]}>('deleteNotes', {
            'notes': noteIds
        })
    }

    async notesInfo(noteIds: Array<number>) {
        return this.invoke<{notes: Array<number>}, Array<{cards: Array<number>}>>('notesInfo', {
            notes: noteIds
        })
    }

    async createDeck(deckName: string) {
        return this.invoke<{deck: string}, number>('createDeck', {
            deck: deckName
        })
    }

    async multi<P, R>(actionName: string, actionList: P[]) {
        return this.invoke<{actions: Omit<Request<P>, 'version'>[]}, R[]>('multi', {
            actions: actionList.map(params => ({
                action: actionName,
                params: params
            }))
        });
    }
}

export default Anki;
