import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  type ConnectionOptions,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { StreamListenerService } from './stream-listener.service';
import {
  buildNatsConnectionOptions,
  shouldSkipNatsBootstrap,
  startNatsSubscription,
  shutdownNatsResources,
} from './nats-connection.utils';

const TELEMETRY_SUBJECT = 'telemetry.data.*.*';

@Injectable()
export class TelemetryStreamBridgeService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelemetryStreamBridgeService.name);
  private connection: NatsConnection | null = null;
  private subscription: Subscription | null = null;

  constructor(private readonly streamListener: StreamListenerService) {}

  async onModuleInit(): Promise<void> {
    if (shouldSkipNatsBootstrap()) {
      return;
    }

    await this.connectAndSubscribe();
  }

  async onModuleDestroy(): Promise<void> {
    const subscription = this.subscription;
    const connection = this.connection;

    this.subscription = null;
    this.connection = null;

    await shutdownNatsResources(subscription, connection);
  }

  private async connectAndSubscribe(): Promise<void> {
    const started = await startNatsSubscription({
      connectionOptions: this.buildConnectionOptions(),
      logger: this.logger,
      subject: TELEMETRY_SUBJECT,
      successMessage: `Subscribed to telemetry subject ${TELEMETRY_SUBJECT}`,
      failureMessage: 'Failed to initialize telemetry NATS bridge',
      onSubscription: (subscription) => {
        void this.consumeMessages(subscription);
      },
    });

    if (!started) {
      return;
    }

    this.connection = started.connection;
    this.subscription = started.subscription;
  }

  private async consumeMessages(subscription: Subscription): Promise<void> {
    for await (const message of subscription) {
      try {
        const tenantId = this.extractTenantId(message.subject);
        const payload = this.parseEnvelope(message.data);

        if (!tenantId || !payload) {
          continue;
        }

        this.streamListener.publishLiveMeasure(tenantId, payload);
      } catch (error) {
        this.logger.error(
          `Failed to process telemetry message on ${message.subject}`,
          error as Error,
        );
      }
    }
  }

  private buildConnectionOptions(): ConnectionOptions {
    return buildNatsConnectionOptions(this.logger);
  }

  private extractTenantId(subject: string): string | undefined {
    const parts = subject.split('.');

    if (parts.length !== 4) {
      return undefined;
    }

    return parts[2];
  }

  private parseEnvelope(data: Uint8Array): EncryptedEnvelopeModel | undefined {
    try {
      const parsed = JSON.parse(
        Buffer.from(data).toString('utf8'),
      ) as Partial<EncryptedEnvelopeModel>;

      if (
        !parsed.gatewayId ||
        !parsed.sensorId ||
        !parsed.sensorType ||
        !parsed.timestamp ||
        !parsed.encryptedData ||
        !parsed.iv ||
        !parsed.authTag ||
        typeof parsed.keyVersion !== 'number'
      ) {
        this.logger.warn('Ignoring telemetry message with invalid envelope');
        return undefined;
      }

      return {
        gatewayId: parsed.gatewayId,
        sensorId: parsed.sensorId,
        sensorType: parsed.sensorType,
        timestamp: parsed.timestamp,
        encryptedData: parsed.encryptedData,
        iv: parsed.iv,
        authTag: parsed.authTag,
        keyVersion: parsed.keyVersion,
      };
    } catch (error) {
      this.logger.warn(
        `Ignoring telemetry message with invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    }
  }
}
