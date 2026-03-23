import { Injectable } from '@nestjs/common';
import { Observable, interval, map, filter } from 'rxjs';

import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { StreamInput } from '../interfaces/stream.input';

@Injectable()
export class StreamListenerService {
  stream(input: StreamInput): Observable<EncryptedEnvelopeModel> {
    return this.listenToSource().pipe(
      filter((event) => this.matchesFilters(event, input)),
    );
  }

  private listenToSource(): Observable<EncryptedEnvelopeModel> {
    return interval(1000).pipe(map(() => this.createSampleEvent()));
  }

  private matchesFilters(
    event: EncryptedEnvelopeModel,
    input: StreamInput,
  ): boolean {
    const matchesGateway =
      !input.gatewayId?.length || input.gatewayId.includes(event.gatewayId);

    const matchesSensor =
      !input.sensorId?.length || input.sensorId.includes(event.sensorId);

    const matchesSensorType =
      !input.sensorType?.length || input.sensorType.includes(event.sensorType);

    return matchesGateway && matchesSensor && matchesSensorType;
  }

  private createSampleEvent(): EncryptedEnvelopeModel {
    return {
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      timestamp: new Date().toISOString(),
      encryptedData: 'encrypted',
      iv: 'iv',
      authTag: 'tag',
      keyVersion: 1,
    };
  }
}
