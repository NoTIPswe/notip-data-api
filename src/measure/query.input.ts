import { ExportInput } from './export.input';

export class QueryInput extends ExportInput {
  cursor?: string;
  limit: number;
}