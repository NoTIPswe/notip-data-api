import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'node:fs';
import {
  type ConnectionOptions,
  connect,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { StreamListenerService } from './stream-listener.service';

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
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.connectAndSubscribe();
  }

  async onModuleDestroy(): Promise<void> {
    this.subscription?.unsubscribe();
    this.subscription = null;

    if (this.connection) {
      await this.connection.drain();
      await this.connection.close();
      this.connection = null;
    }
  }

  private async connectAndSubscribe(): Promise<void> {
    try {
      this.connection = await connect(this.buildConnectionOptions());
      this.subscription = this.connection.subscribe(TELEMETRY_SUBJECT);

      void this.consumeMessages(this.subscription);
      this.logger.log(`Subscribed to telemetry subject ${TELEMETRY_SUBJECT}`);
    } catch (error) {
      this.logger.error(
        'Failed to initialize telemetry NATS bridge',
        error as Error,
      );
    }
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
    const options: ConnectionOptions = {
      servers: this.resolveServers(),
      name: process.env.NATS_CLIENT_NAME ?? 'data-api',
    };

    const caFile = process.env.NATS_TLS_CA;
    const certFile = process.env.NATS_TLS_CERT;
    const keyFile = process.env.NATS_TLS_KEY;

    if (caFile && certFile && keyFile) {
      try {
        (options as { tls: any }).tls = {
          ca: [fs.readFileSync(caFile)],
          cert: fs.readFileSync(certFile),
          key: fs.readFileSync(keyFile),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to load NATS TLS certificates: ${message}`);
      }
    }

    const token = process.env.NATS_TOKEN?.trim();
    const user = process.env.NATS_USER?.trim();
    const pass = process.env.NATS_PASSWORD?.trim();

    if (token) {
      options.token = token;
      return options;
    }

    if (user && pass) {
      options.user = user;
      options.pass = pass;
    }

    return options;
  }

  private resolveServers(): string[] {
    const raw = process.env.NATS_SERVERS ?? process.env.NATS_URL;

    if (!raw) {
      return ['nats://localhost:4222'];
    }

    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
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
