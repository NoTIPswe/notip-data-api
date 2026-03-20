import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { StreamInput } from '../interfaces/stream.input';


@Injectable()
export class StreamListenerService {

  /**
   * Metodo principale esposto al controller.
   * 
   * - Riceve i filtri (StreamInput)
   * - Restituisce uno stream di EncryptedEnvelopeModel
   * - Applica i filtri sugli eventi ricevuti dalla sorgente esterna
   */
  stream(input: StreamInput): Observable<EncryptedEnvelopeModel> {

    return this.listenToSource().pipe(
      filter((event) => this.matchesFilters(event, input)),
    );
  }

  /**
   * Qui ci si collega alla sorgente reale degli eventi.

   * 
   * ATTUALMENTE NON IMPLEMENTATO → placeholder architetturale
   */
  private listenToSource(): Observable<EncryptedEnvelopeModel> {
    return new Observable<EncryptedEnvelopeModel>((subscriber) => {

      // TODO: sostituire con sorgente reale

      // Esempio (NON reale):
      // externalSource.onMessage((rawEvent) => {
      //   const model = this.mapToModel(rawEvent);
      //   subscriber.next(model);
      // });

      // Cleanup quando il client si disconnette
      return () => {
        // unsubscribe / disconnect dalla sorgente reale
      };
    });
  }

  /**
   * Applica i filtri definiti nello StreamInput.
   * 
   * Regola:
   * - Se un filtro NON è presente → non filtra (passa tutto)
   * - Se è presente → deve matchare
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