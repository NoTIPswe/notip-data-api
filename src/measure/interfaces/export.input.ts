import { StreamInput } from './stream.input';

export interface ExportInput extends StreamInput {
  from: string;
  to: string;
}