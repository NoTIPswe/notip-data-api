import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { StreamInput } from '../interfaces/stream.input';

@Injectable()
export class StreamListenerService {

  /**
   * Espone uno stream filtrato al controller.
   */
  stream(input: StreamInput): Observable<EncryptedEnvelopeModel> {
    return this.listenToSource().pipe(
      filter((event) => this.matchesFilters(event, input)),
    );
  }

  /**
   * Sorgente degli eventi.
   * 
   * ⚠️ ATTUALE: simulazione per sviluppo
   * 🔜 FUTURO: Kafka / MQTT / WebSocket / EventBus
   */
  private listenToSource(): Observable<EncryptedEnvelopeModel> {
    return new Observable<EncryptedEnvelopeModel>((subscriber) => {

      // 🔧 MOCK per sviluppo (rimuovere quando hai la sorgente reale)
      const interval = setInterval(() => {
        subscriber.next({
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          timestamp: new Date().toISOString(),
          encryptedData: 'encrypted',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: 1,
        });
      }, 1000);

      // Cleanup quando il client si disconnette
      return () => {
        clearInterval(interval);
      };
    });
  }

  /**
   * Applica i filtri dello stream.
   */
  private matchesFilters(
    event: EncryptedEnvelopeModel,
    input: StreamInput,
  ): boolean {

    const matchesGateway =
      !input.gatewayId?.length || input.gatewayId.includes(event.gatewayId);

    const matchesSensor =
      !input.sensorId?.length || input.sensorId.includes(event.sensorId);

    const matchesSensorType =
      !input.sensorType?.length ||
      input.sensorType.includes(event.sensorType);

    return matchesGateway && matchesSensor && matchesSensorType;
  }
}