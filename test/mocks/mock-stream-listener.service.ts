import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { EncryptedEnvelopeModel } from '../../src/data-api/models/encrypted-envelope.model';

const STREAM_EVENT: EncryptedEnvelopeModel = {
  gatewayId: 'gw-1',
  sensorId: 'sensor-1',
  sensorType: 'temperature',
  timestamp: '2026-03-23T09:58:00.000Z',
  encryptedData: 'enc-stream',
  iv: 'iv-stream',
  authTag: 'tag-stream',
  keyVersion: 1,
};

@Injectable()
export class MockStreamListenerService {
  stream(): Observable<EncryptedEnvelopeModel> {
    return of(STREAM_EVENT);
  }
}
