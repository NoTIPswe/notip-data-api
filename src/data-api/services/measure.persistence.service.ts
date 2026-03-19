import { Injectable } from '@nestjs/common';
import { MeasureEntity } from './../entity/measure.entity';
import { NpQueryPersistenceInput } from './../interfaces/np-query-persistence.input';
import { PQueryPersistenceInput } from './../interfaces/p-query-persistence.input';
import { Repository } from 'typeorm';
import { PaginatedQuery } from './../interfaces/paginated-query';




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