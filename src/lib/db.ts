import Dexie, { Table } from 'dexie';

export interface MedicalDocument {
  id?: number;
  title: string;
  content: string;
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