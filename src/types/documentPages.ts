export interface DocumentPageSection {
  /** Physical page number in the current layout or original imported PDF. */
  number: number;
  /** Short user-facing label, normally "Pagina N". */
  title?: string;
  /** Plain text extracted from blocks assigned to this page. */
  text: string;
}
