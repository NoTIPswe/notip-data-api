import { NpQueryPersistenceInput } from './np-query-persistence.input';
import { MeasureEntity } from '../entity/measure.entity';

export interface NpQueryPersistenceService {
  nonPaginatedQuery(n: NpQueryPersistenceInput): Promise<MeasureEntity[]>;
}
