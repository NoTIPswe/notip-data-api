import { NpQueryPersistenceInput } from './np-query-persistence.input';

export interface PQueryPersistenceInput extends NpQueryPersistenceInput {
  cursor?: string;
  limit: number;
}
