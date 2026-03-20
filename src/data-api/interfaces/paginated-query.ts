import { MeasureEntity } from './../entity/measure.entity';

export interface PaginatedQuery {
  data: MeasureEntity[];
  nextCursor?: string;
  hasMore: boolean;
}
