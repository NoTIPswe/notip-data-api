import { Injectable } from '@nestjs/common';
import { MeasureEntity } from './measure.entity';
import { NpQueryPersistenceInput } from './np-query-persistence.input';
import { PQueryPersistenceInput } from './p-query-persistence.input';
import { Repository } from 'typeorm';
import { PaginatedQuery } from './paginated-query';




@Injectable()
export class MeasurePersistenceService {
    constructor(private readonly r: Repository<MeasureEntity>){}
    
    async paginatedQuery(p: PQueryPersistenceInput): Promise<PaginatedQuery>{
        //operation
        return;
    }

    async nonPaginatedQuery(n: NpQueryPersistenceInput): Promise<MeasureEntity[]>{
        //operation
        return;
    }
}