import { MeasureEntity } from './measure.entity';
 
export interface PaginatedQuery {
  data?: MeasureEntity[];
  nextCursor?: string;
  hasMore: boolean;
}