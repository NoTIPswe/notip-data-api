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
  type Msg,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { MeasurePersistenceService } from './measure.persistence.service';

const COST_SUBJECT = 'internal.cost';

type CostRequest = {
  tenant_id?: string;
};

type CostResponse = {
  dataSizeAtRest: number;
};

@Injectable()
export class CostNatsResponderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CostNatsResponderService.name);
  private connection: NatsConnection | null = null;
  private subscription: Subscription | null = null;

  constructor(private readonly persistence: MeasurePersistenceService) {}

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
      this.subscription = this.connection.subscribe(COST_SUBJECT);
      void this.consumeMessages(this.subscription);
      this.logger.log(`Subscribed to cost subject ${COST_SUBJECT}`);
    } catch (error) {
      this.logger.error(
        'Failed to initialize cost responder NATS bridge',
        error as Error,
      );
    }
  }

  private async consumeMessages(subscription: Subscription): Promise<void> {
    for await (const message of subscription) {
      try {
        const tenantId = this.extractTenantId(message.data);
        if (!tenantId) {
          this.logger.warn('Ignoring cost request with invalid payload');
          this.respondWithCost(message, 0);
          continue;
        }

        const dataSizeAtRest =
          await this.persistence.getTenantDataSizeAtRest(tenantId);
        this.respondWithCost(message, dataSizeAtRest);
      } catch (error) {
        this.logger.error(
          `Failed to process cost request on ${COST_SUBJECT}`,
          error as Error,
        );
        this.respondWithCost(message, 0);
      }
    }
  }

  private extractTenantId(data: Uint8Array): string | undefined {
    try {
      const payload = JSON.parse(
        Buffer.from(data).toString('utf8'),
      ) as CostRequest;
      const tenantId = payload.tenant_id?.trim();

      if (!tenantId) {
        return undefined;
      }

      return tenantId;
    } catch {
      return undefined;
    }
  }

  private respondWithCost(message: Msg, dataSizeAtRest: number): void {
    const response: CostResponse = { dataSizeAtRest };

    try {
      message.respond(Buffer.from(JSON.stringify(response)));
    } catch (error) {
      this.logger.error(
        'Failed to respond to internal.cost request',
        error as Error,
      );
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
}
