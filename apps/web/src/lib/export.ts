export type ExportFormat = 'md' | 'json';
export type ExportResult =
  | { status: 'saved'; path: string }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'error' };

/** Writes every record in the chosen format. */
export async function exportRecords(_format: ExportFormat): Promise<ExportResult> {
  // replaced in step 3
  return { status: 'unavailable' };
}
