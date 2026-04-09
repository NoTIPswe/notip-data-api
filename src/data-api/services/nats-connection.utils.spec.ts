import { Logger } from '@nestjs/common';
import type { ConnectionOptions, NatsConnection, Subscription } from 'nats';

type NatsUtilsModule = typeof import('./nats-connection.utils');

function loadNatsUtilsModule(): NatsUtilsModule {
  let moduleExports!: NatsUtilsModule;

  jest.isolateModules(() => {
    moduleExports = jest.requireActual<NatsUtilsModule>(
      './nats-connection.utils',
    );
  });

  return moduleExports;
}

function createLoggerMock(): {
  logger: Logger;
  log: jest.Mock;
  error: jest.Mock;
} {
  const log = jest.fn();
  const error = jest.fn();

  return {
    logger: {
      log,
      error,
    } as unknown as Logger,
    log,
    error,
  };
}

describe('nats-connection.utils', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('shouldSkipNatsBootstrap', () => {
    it('returns true when node environment is test', () => {
      const { shouldSkipNatsBootstrap } = loadNatsUtilsModule();

      expect(shouldSkipNatsBootstrap('test')).toBe(true);
    });

    it('reads process.env.NODE_ENV when argument is omitted', () => {
      const { shouldSkipNatsBootstrap } = loadNatsUtilsModule();

      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
      };
      expect(shouldSkipNatsBootstrap()).toBe(true);

      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
      };
      expect(shouldSkipNatsBootstrap()).toBe(false);
    });
  });

  describe('shutdownNatsResources', () => {
    it('is a no-op when subscription and connection are null', async () => {
      const { shutdownNatsResources } = loadNatsUtilsModule();

      await expect(shutdownNatsResources(null, null)).resolves.toBeUndefined();
    });

    it('unsubscribes and closes active NATS resources', async () => {
      const { shutdownNatsResources } = loadNatsUtilsModule();

      const unsubscribe = jest.fn();
      const drain = jest.fn().mockResolvedValue(undefined);
      const close = jest.fn().mockResolvedValue(undefined);

      const subscription = {
        unsubscribe,
      } as unknown as Subscription;
      const connection = {
        drain,
        close,
      } as unknown as NatsConnection;

      await shutdownNatsResources(subscription, connection);

      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(drain).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildNatsConnectionOptions', () => {
    it('uses defaults when NATS environment variables are missing', () => {
      process.env = {
        ...originalEnv,
        NATS_SERVERS: undefined,
        NATS_URL: undefined,
        NATS_CLIENT_NAME: undefined,
        NATS_TOKEN: undefined,
        NATS_USER: undefined,
        NATS_PASSWORD: undefined,
        NATS_TLS_CA: undefined,
        NATS_TLS_CERT: undefined,
        NATS_TLS_KEY: undefined,
      };

      const { logger, error } = createLoggerMock();
      const { buildNatsConnectionOptions } = loadNatsUtilsModule();

      const options = buildNatsConnectionOptions(logger);

      expect(options).toEqual({
        servers: ['nats://localhost:4222'],
        name: 'data-api',
      });
      expect(error).not.toHaveBeenCalled();
    });

    it('normalizes server list and prefers token auth over user/password', () => {
      process.env = {
        ...originalEnv,
        NATS_SERVERS: ' nats://one:4222, , nats://two:4222 ',
        NATS_CLIENT_NAME: 'custom-client',
        NATS_TOKEN: ' token-value ',
        NATS_USER: ' demo-user ',
        NATS_PASSWORD: ' demo-pass ',
      };

      const { logger } = createLoggerMock();
      const { buildNatsConnectionOptions } = loadNatsUtilsModule();

      const options = buildNatsConnectionOptions(logger);

      expect(options).toEqual({
        servers: ['nats://one:4222', 'nats://two:4222'],
        name: 'custom-client',
        token: 'token-value',
      });
      expect((options as { user?: string }).user).toBeUndefined();
      expect((options as { pass?: string }).pass).toBeUndefined();
    });

    it('uses user/password auth when token is not provided', () => {
      process.env = {
        ...originalEnv,
        NATS_URL: ' nats://single:4222 ',
        NATS_TOKEN: undefined,
        NATS_USER: ' demo-user ',
        NATS_PASSWORD: ' demo-pass ',
      };

      const { logger } = createLoggerMock();
      const { buildNatsConnectionOptions } = loadNatsUtilsModule();

      const options = buildNatsConnectionOptions(logger);

      expect(options).toEqual({
        servers: ['nats://single:4222'],
        name: 'data-api',
        user: 'demo-user',
        pass: 'demo-pass',
      });
    });

    it('adds TLS options when all TLS file paths are configured', () => {
      process.env = {
        ...originalEnv,
        NATS_TLS_CA: '/tmp/ca.pem',
        NATS_TLS_CERT: '/tmp/cert.pem',
        NATS_TLS_KEY: '/tmp/key.pem',
      };

      const readFileSync = jest
        .fn()
        .mockReturnValueOnce(Buffer.from('ca'))
        .mockReturnValueOnce(Buffer.from('cert'))
        .mockReturnValueOnce(Buffer.from('key'));

      jest.doMock('node:fs', () => {
        const actualFs =
          jest.requireActual<typeof import('node:fs')>('node:fs');
        return {
          ...actualFs,
          readFileSync,
        };
      });

      const { logger } = createLoggerMock();
      const { buildNatsConnectionOptions } = loadNatsUtilsModule();

      const options = buildNatsConnectionOptions(logger);

      expect((options as { tls?: unknown }).tls).toEqual({
        ca: [Buffer.from('ca')],
        cert: Buffer.from('cert'),
        key: Buffer.from('key'),
      });
      expect(readFileSync).toHaveBeenCalledTimes(3);
    });

    it('logs TLS read errors when fs throws an Error object', () => {
      process.env = {
        ...originalEnv,
        NATS_TLS_CA: '/tmp/ca.pem',
        NATS_TLS_CERT: '/tmp/cert.pem',
        NATS_TLS_KEY: '/tmp/key.pem',
      };

      const readFileSync = jest.fn(() => {
        throw new Error('missing cert');
      });

      jest.doMock('node:fs', () => {
        const actualFs =
          jest.requireActual<typeof import('node:fs')>('node:fs');
        return {
          ...actualFs,
          readFileSync,
        };
      });

      const { logger, error } = createLoggerMock();
      const { buildNatsConnectionOptions } = loadNatsUtilsModule();

      const options = buildNatsConnectionOptions(logger);

      expect((options as { tls?: unknown }).tls).toBeUndefined();
      expect(error).toHaveBeenCalledWith(
        'Failed to load NATS TLS certificates: missing cert',
      );
    });

    it('logs TLS read errors when fs throws a non-Error value', () => {
      process.env = {
        ...originalEnv,
        NATS_TLS_CA: '/tmp/ca.pem',
        NATS_TLS_CERT: '/tmp/cert.pem',
        NATS_TLS_KEY: '/tmp/key.pem',
      };

      const readFileSync = jest.fn(() => {
        throw 'io-failure' as unknown as Error;
      });

      jest.doMock('node:fs', () => {
        const actualFs =
          jest.requireActual<typeof import('node:fs')>('node:fs');
        return {
          ...actualFs,
          readFileSync,
        };
      });

      const { logger, error } = createLoggerMock();
      const { buildNatsConnectionOptions } = loadNatsUtilsModule();

      buildNatsConnectionOptions(logger);

      expect(error).toHaveBeenCalledWith(
        'Failed to load NATS TLS certificates: io-failure',
      );
    });
  });

  describe('startNatsSubscription', () => {
    it('starts the subscription and logs success', async () => {
      const subscription = {
        unsubscribe: jest.fn(),
      } as unknown as Subscription;
      const subscribe = jest.fn().mockReturnValue(subscription);
      const connection = {
        subscribe,
      } as unknown as NatsConnection;
      const connect = jest.fn().mockResolvedValue(connection);
      const onSubscription = jest.fn();

      jest.doMock('nats', () => ({
        connect,
      }));

      const { logger, log, error } = createLoggerMock();
      const { startNatsSubscription } = loadNatsUtilsModule();

      const connectionOptions: ConnectionOptions = {
        servers: ['nats://one:4222'],
      };

      const result = await startNatsSubscription({
        connectionOptions,
        logger,
        subject: 'internal.cost',
        successMessage: 'started',
        failureMessage: 'failed',
        onSubscription,
      });

      expect(connect).toHaveBeenCalledWith(connectionOptions);
      expect(subscribe).toHaveBeenCalledWith('internal.cost');
      expect(onSubscription).toHaveBeenCalledWith(subscription);
      expect(log).toHaveBeenCalledWith('started');
      expect(error).not.toHaveBeenCalled();
      expect(result).toEqual({
        connection,
        subscription,
      });
    });

    it('logs errors and returns undefined when connect fails', async () => {
      const connectError = new Error('nats down');
      const connect = jest.fn().mockRejectedValue(connectError);
      const onSubscription = jest.fn();

      jest.doMock('nats', () => ({
        connect,
      }));

      const { logger, log, error } = createLoggerMock();
      const { startNatsSubscription } = loadNatsUtilsModule();

      const result = await startNatsSubscription({
        connectionOptions: {
          servers: ['nats://one:4222'],
        },
        logger,
        subject: 'internal.cost',
        successMessage: 'started',
        failureMessage: 'failed',
        onSubscription,
      });

      expect(result).toBeUndefined();
      expect(connect).toHaveBeenCalledTimes(1);
      expect(onSubscription).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('failed', connectError);
    });
  });
});
