import Dexie, { Table } from 'dexie';

export interface MedicalDocument {
  id?: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  /** Optional local metadata; older saved documents remain compatible. */
  favorite?: boolean;
  folder?: string;
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