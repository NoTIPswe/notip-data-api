import { Injectable } from '@nestjs/common';
import {
  concat,
  EMPTY,
  from,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  Subject,
  filter,
  take,
  takeUntil,
  timer,
} from 'rxjs';

import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { StreamInput } from '../interfaces/stream.input';
import { MeasurePersistenceService } from './measure.persistence.service';
import { MeasureMapper } from '../measure.mapper';

export type StreamEmission =
  | {
      kind: 'data';
      data: EncryptedEnvelopeModel;
    }
  | {
      kind: 'error';
      reason: 'token_expired';
    };

@Injectable()
export class StreamListenerService {
  private readonly tenantStreams = new Map<
    string,
    Subject<EncryptedEnvelopeModel>
  >();

  constructor(private readonly mps: MeasurePersistenceService) {}

  stream(input: StreamInput): Observable<StreamEmission> {
    const baseStream = concat(
      this.replayHistorical(input),
      this.listenToSource(input).pipe(
        filter(
          (event) =>
            event.kind === 'error' || this.matchesFilters(event.data, input),
        ),
      ),
    );

    if (this.isTokenExpired(input.tokenExpiresAt)) {
      return of({
        kind: 'error',
        reason: 'token_expired',
      });
    }

    if (!input.tokenExpiresAt) {
      return baseStream;
    }

    const expiration$ = timer(
      Math.max(input.tokenExpiresAt - Date.now(), 0),
    ).pipe(take(1));

    return merge(
      baseStream.pipe(takeUntil(expiration$)),
      expiration$.pipe(
        map(
          () =>
            ({
              kind: 'error',
              reason: 'token_expired',
            }) satisfies StreamEmission,
        ),
      ),
    );
  }

  publishLiveMeasure(tenantId: string, event: EncryptedEnvelopeModel): void {
    this.getTenantStream(tenantId).next(event);
  }

  private replayHistorical(input: StreamInput): Observable<StreamEmission> {
    if (!input.since) {
      return EMPTY;
    }

    return from(
      this.mps.nonPaginatedQuery({
        tenantId: input.tenantId,
        gatewayId: input.gatewayId,
        sensorId: input.sensorId,
        sensorType: input.sensorType,
        from: input.since,
        to: new Date().toISOString(),
      }),
    ).pipe(
      map((entities) => MeasureMapper.toEncryptedEnvelopeModels(entities)),
      mergeMap((models) => from(models)),
      map((model) => ({ kind: 'data', data: model }) satisfies StreamEmission),
    );
  }

  private listenToSource(input: StreamInput): Observable<StreamEmission> {
    return new Observable<StreamEmission>((subscriber) => {
      const tenantStream = this.getTenantStream(input.tenantId);
      const subscription = tenantStream.subscribe((event) => {
        subscriber.next({
          kind: 'data',
          data: event,
        });
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  private getTenantStream(
    tenantId = 'anonymous',
  ): Subject<EncryptedEnvelopeModel> {
    const existing = this.tenantStreams.get(tenantId);

    if (existing) {
      return existing;
    }

    const subject = new Subject<EncryptedEnvelopeModel>();
    this.tenantStreams.set(tenantId, subject);
    return subject;
  }

  private isTokenExpired(tokenExpiresAt?: number): boolean {
    return tokenExpiresAt !== undefined && tokenExpiresAt <= Date.now();
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
}
