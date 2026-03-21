import {
  Injectable,
  UnauthorizedException,
  //ForbiddenException,
} from '@nestjs/common';
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
    // if (this.isUnauthorized(input)) {
    //   throw new UnauthorizedException('Unauthorized');
    // }

    // if (this.isForbidden(input)) {
    //   throw new ForbiddenException('Forbidden');
    // }    return this.listenToSource(input).pipe(

    return this.listenToSource().pipe(
      filter((event) => this.matchesFilters(event, input)),
    );
  }

  /**
   * Sorgente degli eventi.
   *
   * ⚠️ ATTUALE: simulazione per sviluppo
   * 🔜 FUTURO: Kafka / MQTT / WebSocket / EventBus
   *   private listenToSource(input: StreamInput): Observable<EncryptedEnvelopeModel> {

   */
  private listenToSource(): Observable<EncryptedEnvelopeModel> {
    return new Observable<EncryptedEnvelopeModel>((subscriber) => {
      const interval = setInterval(() => {
        //if (this.isTokenExpired(input)) {
        clearInterval(interval);
        subscriber.error(new UnauthorizedException('Token expired'));
        return;
        //}

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
      !input.sensorType?.length || input.sensorType.includes(event.sensorType);

    return matchesGateway && matchesSensor && matchesSensorType;
  }

  /**
   * Simulazione controllo 401.
   * Sostituire con validazione reale del token.
   */
  // private isUnauthorized(input: StreamInput): boolean {
  //   return false;
  // }

  // /**
  //  * Simulazione controllo 403.
  //  * Sostituire con controllo reale dei permessi.
  //  */
  // private isForbidden(input: StreamInput): boolean {
  //   return false;
  // }

  // /**
  //  * Simulazione token scaduto durante lo stream.
  //  * Sostituire con controllo reale su exp / sessione / auth provider.
  //  */
  // private isTokenExpired(input: StreamInput): boolean {
  //   return false;
  // }
}
