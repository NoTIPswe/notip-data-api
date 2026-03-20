import { ExportInput } from './export.input';

export interface QueryInput extends ExportInput {
  cursor?: string;
  limit: number;
}
