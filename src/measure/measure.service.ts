import { Injectable } from '@nestjs/common';
import { EncryptedEnvelopeModel } from './encrypted-envelope.model';
import { MeasurePersistenceService } from './measure.persistence.service';
import { PaginatedQueryModel } from './paginated-query.model';
import { ExportInput } from './export.input';
import { QueryInput } from './query.input';
import { StreamInput } from './stream.input';

@Injectable()
export class MeasureService {
    constructor(private readonly mps: MeasurePersistenceService) {}

    async query(input: QueryInput): Promise<PaginatedQueryModel[]> {
        return {
        data:  [],
        nextCursor: input.cursor,
        hasMore: false,
        };
    }

    async stream(input: StreamInput): Promise<EncryptedEnvelopeModel> {
        return {
        gatewayId: input.gatewayId ?? 'gw-1',
        sensorId: input.sensorId ?? 'sensor-1',
        sensorType: input.sensorType ?? 'temperature',
        timestamp: new Date().toISOString(),
        encryptedData: 'encrypted-payload',
        iv: 'iv-value',
        authTag: 'auth-tag',
        keyVersion: 1,
        };
    }

    async export(input: ExportInput): Promise<EncryptedEnvelopeModel[]> {
        return [
        {
            gatewayId: input.gatewayId ?? 'gw-1',
            sensorId: input.sensorId ?? 'sensor-1',
            sensorType: input.sensorType ?? 'temperature',
            timestamp: input.from,
            encryptedData: 'encrypted-payload',
            iv: 'iv-value',
            authTag: 'auth-tag',
            keyVersion: 1,
        },
        ];
    }
}