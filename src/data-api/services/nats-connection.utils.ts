import { Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import {
  type ConnectionOptions,
  connect,
  type NatsConnection,
  type Subscription,
} from 'nats';

const DEFAULT_NATS_SERVER = 'nats://localhost:4222';

type StartSubscriptionInput = {
  connectionOptions: ConnectionOptions;
  logger: Logger;
  subject: string;
  successMessage: string;
  failureMessage: string;
  onSubscription: (subscription: Subscription) => void;
};

export function shouldSkipNatsBootstrap(
  nodeEnv = process.env.NODE_ENV,
): boolean {
  return nodeEnv === 'test';
}

export async function shutdownNatsResources(
  subscription: Subscription | null,
  connection: NatsConnection | null,
): Promise<void> {
  subscription?.unsubscribe();
  await connection?.drain();
  await connection?.close();
}

export function buildNatsConnectionOptions(logger: Logger): ConnectionOptions {
  const options: ConnectionOptions = {
    servers: resolveNatsServers(),
    name: process.env.NATS_CLIENT_NAME ?? 'data-api',
  };

  applyTlsOptions(options, logger);
  applyAuthOptions(options);

  return options;
}

export async function startNatsSubscription(
  input: StartSubscriptionInput,
): Promise<
  { connection: NatsConnection; subscription: Subscription } | undefined
> {
  try {
    const connection = await connect(input.connectionOptions);
    const subscription = connection.subscribe(input.subject);

    input.onSubscription(subscription);
    input.logger.log(input.successMessage);

    return {
      connection,
      subscription,
    };
  } catch (error) {
    input.logger.error(input.failureMessage, error as Error);
    return undefined;
  }
}

function resolveNatsServers(): string[] {
  const raw = process.env.NATS_SERVERS ?? process.env.NATS_URL;

  if (!raw) {
    return [DEFAULT_NATS_SERVER];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function applyTlsOptions(options: ConnectionOptions, logger: Logger): void {
  const caFile = process.env.NATS_TLS_CA;
  const certFile = process.env.NATS_TLS_CERT;
  const keyFile = process.env.NATS_TLS_KEY;

  if (!caFile || !certFile || !keyFile) {
    return;
  }

  try {
    (options as { tls: any }).tls = {
      ca: [fs.readFileSync(caFile)],
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load NATS TLS certificates: ${message}`);
  }
}

function applyAuthOptions(options: ConnectionOptions): void {
  const token = process.env.NATS_TOKEN?.trim();
  const user = process.env.NATS_USER?.trim();
  const pass = process.env.NATS_PASSWORD?.trim();

  if (token) {
    options.token = token;
    return;
  }

  if (user && pass) {
    options.user = user;
    options.pass = pass;
  }
}
