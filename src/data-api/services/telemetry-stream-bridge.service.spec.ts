import { Logger } from '@nestjs/common';
import type { ConnectionOptions, Subscription } from 'nats';
import { TelemetryStreamBridgeService } from './telemetry-stream-bridge.service';
import { StreamListenerService } from './stream-listener.service';

type TestableTelemetryBridgeService = {
  logger: Logger;
  buildConnectionOptions: () => ConnectionOptions;
  consumeMessages: (subscription: Subscription) => Promise<void>;
  extractTenantId: (subject: string) => string | undefined;
  parseEnvelope: (data: Uint8Array) => unknown;
};

function asTestableService(
  service: TelemetryStreamBridgeService,
): TestableTelemetryBridgeService {
  return service as unknown as TestableTelemetryBridgeService;
}

describe('TelemetryStreamBridgeService', () => {
  const originalEnv = process.env;

  function loadServiceClass(): typeof TelemetryStreamBridgeService {
    let ServiceClass!: typeof TelemetryStreamBridgeService;
    jest.isolateModules(() => {
      const moduleExports = jest.requireActual<
        typeof import('./telemetry-stream-bridge.service')
      >('./telemetry-stream-bridge.service');
      ServiceClass = moduleExports.TelemetryStreamBridgeService;
    });

    return ServiceClass;
  }

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('subscribes to telemetry subjects and forwards envelopes to the stream listener', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_URL: 'nats://localhost:4222',
    };

    let messageConsumed!: () => void;
    const consumed = new Promise<void>((resolve) => {
      messageConsumed = resolve;
    });

    const receivedMessages = [
      {
        subject: 'telemetry.data.tenant-1.gateway-1',
        data: Buffer.from(
          JSON.stringify({
            gatewayId: 'gateway-1',
            sensorId: 'sensor-1',
            sensorType: 'temperature',
            timestamp: '2026-03-23T10:00:00.000Z',
            encryptedData: 'enc',
            iv: 'iv',
            authTag: 'tag',
            keyVersion: 1,
          }),
        ),
      },
    ];

    const subscription = {
      unsubscribe: jest.fn(),
      [Symbol.asyncIterator]: async function* () {
        await Promise.resolve();
        yield* receivedMessages;
        messageConsumed();
      },
    } as unknown as Subscription;

    const subscribe = jest.fn().mockReturnValue(subscription);
    const drain = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn().mockResolvedValue(undefined);

    jest.doMock('nats', () => ({
      connect: jest.fn().mockResolvedValue({
        subscribe,
        drain,
        close,
      }),
    }));

    const publishLiveMeasure = jest.fn();
    const streamListener = {
      publishLiveMeasure,
    } as unknown as StreamListenerService;

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass(streamListener);
    await service.onModuleInit();
    await consumed;

    expect(subscribe).toHaveBeenCalledWith('telemetry.data.*.*');
    expect(publishLiveMeasure).toHaveBeenCalledWith('tenant-1', {
      gatewayId: 'gateway-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      timestamp: '2026-03-23T10:00:00.000Z',
      encryptedData: 'enc',
      iv: 'iv',
      authTag: 'tag',
      keyVersion: 1,
    });

    await service.onModuleDestroy();
    expect(drain).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('skips the NATS subscription bootstrap in test mode', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    const connect = jest.fn();
    jest.doMock('nats', () => ({ connect }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      publishLiveMeasure: jest.fn(),
    } as unknown as StreamListenerService);

    await service.onModuleInit();

    expect(connect).not.toHaveBeenCalled();
  });

  it('builds connection options with TLS and token authentication', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_SERVERS: ' nats://one:4222, nats://two:4222 ',
      NATS_CLIENT_NAME: 'custom-client',
      NATS_TOKEN: ' token-value ',
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
      const actualFs = jest.requireActual<typeof import('node:fs')>('node:fs');
      return {
        ...actualFs,
        readFileSync,
      };
    });
    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      publishLiveMeasure: jest.fn(),
    } as unknown as StreamListenerService);
    const testableService = asTestableService(service);

    // Access private method for test
    expect(testableService.buildConnectionOptions()).toEqual({
      servers: ['nats://one:4222', 'nats://two:4222'],
      name: 'custom-client',
      token: 'token-value',
      tls: {
        ca: [Buffer.from('ca')],
        cert: Buffer.from('cert'),
        key: Buffer.from('key'),
      },
    });
    expect(readFileSync).toHaveBeenCalledTimes(3);
  });

  it('falls back to localhost and user/password auth, logging TLS load errors', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_USER: ' demo-user ',
      NATS_PASSWORD: ' demo-pass ',
      NATS_TLS_CA: '/tmp/ca.pem',
      NATS_TLS_CERT: '/tmp/cert.pem',
      NATS_TLS_KEY: '/tmp/key.pem',
    };

    const readFileSync = jest.fn(() => {
      throw new Error('missing cert');
    });

    jest.doMock('node:fs', () => {
      const actualFs = jest.requireActual<typeof import('node:fs')>('node:fs');
      return {
        ...actualFs,
        readFileSync,
      };
    });
    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      publishLiveMeasure: jest.fn(),
    } as unknown as StreamListenerService);
    const testableService = asTestableService(service);
    // Access logger safely
    const logger = testableService.logger;
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation();

    expect(testableService.buildConnectionOptions()).toEqual({
      servers: ['nats://localhost:4222'],
      name: 'data-api',
      user: 'demo-user',
      pass: 'demo-pass',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to load NATS TLS certificates: missing cert',
    );
  });

  it('ignores invalid subjects and malformed envelopes during consumption', async () => {
    const publishLiveMeasure = jest.fn();
    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      publishLiveMeasure,
    } as unknown as StreamListenerService);
    const testableService = asTestableService(service);
    // Access logger safely
    const logger = testableService.logger;
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    const invalidMessages = [
      {
        subject: 'telemetry.data.tenant-only',
        data: Buffer.from(
          JSON.stringify({
            gatewayId: 'gateway-1',
            sensorId: 'sensor-1',
            sensorType: 'temperature',
            timestamp: '2026-03-23T10:00:00.000Z',
            encryptedData: 'enc',
            iv: 'iv',
            authTag: 'tag',
            keyVersion: 1,
          }),
        ),
      },
      {
        subject: 'telemetry.data.tenant-1.gateway-1',
        data: Buffer.from(
          JSON.stringify({
            gatewayId: 'gateway-1',
            sensorId: 'sensor-1',
            sensorType: 'temperature',
            timestamp: '2026-03-23T10:00:00.000Z',
            encryptedData: 'enc',
            iv: 'iv',
            authTag: 'tag',
          }),
        ),
      },
      {
        subject: 'telemetry.data.tenant-1.gateway-1',
        data: Buffer.from('{invalid'),
      },
    ];

    const subscription = {
      [Symbol.asyncIterator]: async function* () {
        // Add await to satisfy require-await
        await Promise.resolve();
        yield* invalidMessages;
      },
    } as unknown as Subscription;

    await testableService.consumeMessages(subscription);

    expect(publishLiveMeasure).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring telemetry message with invalid envelope',
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring telemetry message with invalid JSON:'),
    );
    expect(
      testableService.extractTenantId('telemetry.data.tenant-1.gateway-1'),
    ).toBe('tenant-1');
    expect(
      testableService.extractTenantId('telemetry.data.tenant-1'),
    ).toBeUndefined();
    expect(
      testableService.parseEnvelope(Buffer.from('{invalid')),
    ).toBeUndefined();
  });

  it('logs bootstrap failures and message processing failures', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_URL: 'nats://localhost:4222',
    };

    const connect = jest.fn().mockRejectedValue(new Error('nats unavailable'));
    jest.doMock('nats', () => ({
      connect,
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      publishLiveMeasure: jest.fn(() => {
        throw new Error('stream down');
      }),
    } as unknown as StreamListenerService);
    const testableService = asTestableService(service);
    // Access logger safely
    const logger = testableService.logger;
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation();

    await service.onModuleInit();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to initialize telemetry NATS bridge',
      expect.any(Error),
    );

    const subscription = {
      [Symbol.asyncIterator]: async function* () {
        // Add await to satisfy require-await
        await Promise.resolve();
        yield {
          subject: 'telemetry.data.tenant-1.gateway-1',
          data: Buffer.from(
            JSON.stringify({
              gatewayId: 'gateway-1',
              sensorId: 'sensor-1',
              sensorType: 'temperature',
              timestamp: '2026-03-23T10:00:00.000Z',
              encryptedData: 'enc',
              iv: 'iv',
              authTag: 'tag',
              keyVersion: 1,
            }),
          ),
        };
      },
    } as unknown as Subscription;

    await testableService.consumeMessages(subscription);

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to process telemetry message on telemetry.data.tenant-1.gateway-1',
      expect.any(Error),
    );
  });
});
