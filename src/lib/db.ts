import Dexie, { Table } from 'dexie';

export interface MedicalDocument {
  id?: number;
  title: string;
  content: string;
  /** Optional archive metadata; older IndexedDB records remain valid. */
  favorite?: boolean;
  folder?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MedicalDocsDatabase extends Dexie {
  documents!: Table<MedicalDocument, number>;

  constructor() {
    super('MedicalDocsDB');
    this.version(1).stores({
      documents: '++id, title, updatedAt'
    });
  }
}

export const db = new MedicalDocsDatabase();