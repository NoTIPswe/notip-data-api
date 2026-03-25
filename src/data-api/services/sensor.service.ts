import {
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { NpQueryPersistenceService } from '../interfaces/np-query-persistence.service';
import { GetSensorsInput } from '../interfaces/get-sensors.input';
import { SensorModel } from '../models/sensor.model';
import { NpQueryPersistenceInput } from '../interfaces/np-query-persistence.input';
import { MeasureEntity } from '../entity/measure.entity';
import { NP_QUERY_PERSISTENCE } from '../interfaces/np-query-persistence.token';

type ServiceError = {
  status?: number;
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

function isServiceError(error: unknown): error is ServiceError {
  return typeof error === 'object' && error !== null;
}

@Injectable()
export class SensorService {
  constructor(
    @Inject(NP_QUERY_PERSISTENCE)
    private readonly npqps: NpQueryPersistenceService,
  ) {}

  async getSensors(input: GetSensorsInput): Promise<SensorModel[]> {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const queryInput: NpQueryPersistenceInput = {
      gatewayId: input.gatewayId ? [input.gatewayId] : undefined,
      from: tenMinutesAgo.toISOString(),
      to: now.toISOString(),
    };

    try {
      const measures = await this.npqps.nonPaginatedQuery(queryInput);
      return this.toSensorModels(measures);
    } catch (error: unknown) {
      if (isServiceError(error)) {
        const status = error.status ?? error.response?.status;
        const responseData = error.response?.data;

        if (status === 401) {
          throw new UnauthorizedException(
            responseData ?? error.message ?? 'Unauthorized',
          );
        }

        if (status === 403) {
          throw new ForbiddenException(
            responseData ?? error.message ?? 'Forbidden',
          );
        }

        if (status === 404) {
          throw new NotFoundException(
            responseData ?? error.message ?? 'Not found',
          );
        }
      }

      throw error;
    }
  }

  private toSensorModels(measures: MeasureEntity[]): SensorModel[] {
    const sensorsMap = new Map<string, SensorModel>();

    for (const measure of measures) {
      const key = `${measure.gatewayId}::${measure.sensorId}::${measure.sensorType}`;

      const existing = sensorsMap.get(key);

      if (!existing) {
        sensorsMap.set(key, {
          gatewayId: measure.gatewayId,
          sensorId: measure.sensorId,
          sensorType: measure.sensorType,
          lastSeen: measure.time,
        });
        continue;
      }

      if (new Date(measure.time) > new Date(existing.lastSeen)) {
        existing.lastSeen = measure.time;
      }
    }

    return Array.from(sensorsMap.values());
  }
}
