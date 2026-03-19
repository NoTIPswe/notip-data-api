import { Injectable } from '@nestjs/common';
import { EncryptedEnvelopeModel } from './encrypted-envelope.model';
import { MeasurePersistenceService } from './measure.persistence.service';
import { PaginatedQueryModel } from './paginated-query.model';
import { ExportInput } from './export.input';
import { QueryInput } from './query.input';
import { PQueryPersistenceInput } from './p-query-persistence.input';
import { MeasureMapper } from './measure.mapper';
import { NpQueryPersistenceInput } from './np-query-persistence.input';


@Injectable()
export class MeasureService {
    constructor(private readonly mps: MeasurePersistenceService) {}
    async query(input: QueryInput): Promise<PaginatedQueryModel[]> {
        
        const pInput: PQueryPersistenceInput = {
            gatewayId: input.gatewayId,
            sensorId: input.sensorId,
            sensorType: input.sensorType,
            from: input.from,
            to: input.to,
            cursor: input.cursor,
            limit: input.limit,
        };
        const result = await this.mps.paginatedQuery(pInput);
        return MeasureMapper.toPaginatedQueryModel(result);
    }

    async export(input: ExportInput): Promise<EncryptedEnvelopeModel[]> {
        const pInput: NpQueryPersistenceInput = {
            gatewayId: input.gatewayId,
            sensorId: input.sensorId,
            sensorType: input.sensorType,
            from: input.from,
            to: input.to,
        };
        const result = await this.mps.nonPaginatedQuery(pInput);
        return MeasureMapper.toEncryptedEnvelopeModel(result);
    }
}