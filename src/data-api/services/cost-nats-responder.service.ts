import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  type ConnectionOptions,
  type Msg,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { MeasurePersistenceService } from './measure.persistence.service';
import {
  buildNatsConnectionOptions,
  shouldSkipNatsBootstrap,
  startNatsSubscription,
  shutdownNatsResources,
} from './nats-connection.utils';

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
      subject: COST_SUBJECT,
      successMessage: `Subscribed to cost subject ${COST_SUBJECT}`,
      failureMessage: 'Failed to initialize cost responder NATS bridge',
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
    return buildNatsConnectionOptions(this.logger);
  }
}
