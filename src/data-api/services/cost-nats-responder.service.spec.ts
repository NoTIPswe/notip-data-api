import { Logger } from '@nestjs/common';
import type { ConnectionOptions, Subscription } from 'nats';
import { CostNatsResponderService } from './cost-nats-responder.service';
import { MeasurePersistenceService } from './measure.persistence.service';

type TestableCostResponderService = {
  logger: Logger;
  buildConnectionOptions: () => ConnectionOptions;
  consumeMessages: (subscription: Subscription) => Promise<void>;
  extractTenantId: (data: Uint8Array) => string | undefined;
  respondWithCost: (
    message: { respond: (payload: Buffer) => void },
    dataSizeAtRest: number,
  ) => void;
};

function asTestableService(
  service: CostNatsResponderService,
): TestableCostResponderService {
  return service as unknown as TestableCostResponderService;
}

describe('CostNatsResponderService', () => {
  const originalEnv = process.env;

  function loadServiceClass(): typeof CostNatsResponderService {
    let ServiceClass!: typeof CostNatsResponderService;

    jest.isolateModules(() => {
      const moduleExports = jest.requireActual<
        typeof import('./cost-nats-responder.service')
      >('./cost-nats-responder.service');
      ServiceClass = moduleExports.CostNatsResponderService;
    });

    return ServiceClass;
  }

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('subscribes to internal.cost and responds with real tenant storage size', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_URL: 'nats://localhost:4222',
    };

    let messageConsumed!: () => void;
    const consumed = new Promise<void>((resolve) => {
      messageConsumed = resolve;
    });

    const respond = jest.fn();
    const subscription = {
      unsubscribe: jest.fn(),
      [Symbol.asyncIterator]: async function* () {
        await Promise.resolve();
        yield {
          data: Buffer.from(
            JSON.stringify({
              tenant_id: '00000000-0000-0000-0000-000000000001',
            }),
          ),
          respond,
        };
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

    const getTenantDataSizeAtRest = jest.fn().mockResolvedValue(4096);
    const persistence = {
      getTenantDataSizeAtRest,
    } as unknown as MeasurePersistenceService;

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass(persistence);

    await service.onModuleInit();
    await consumed;

    expect(subscribe).toHaveBeenCalledWith('internal.cost');
    expect(getTenantDataSizeAtRest).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
    );

    const response = JSON.parse(
      (respond.mock.calls[0] as [Buffer])[0].toString('utf8'),
    ) as { dataSizeAtRest: number };
    expect(response).toEqual({ dataSizeAtRest: 4096 });

    await service.onModuleDestroy();
    expect(drain).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('skips NATS bootstrap in test mode', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    const connect = jest.fn();
    jest.doMock('nats', () => ({ connect }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);

    await service.onModuleInit();

    expect(connect).not.toHaveBeenCalled();
  });

  it('logs initialization errors when NATS connection fails', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_URL: 'nats://localhost:4222',
    };

    const connectError = new Error('nats unavailable');
    jest.doMock('nats', () => ({
      connect: jest.fn().mockRejectedValue(connectError),
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);
    const errorSpy = jest
      .spyOn(testableService.logger, 'error')
      .mockImplementation();

    await service.onModuleInit();

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to initialize cost responder NATS bridge',
      connectError,
    );
  });

  it('returns zero when payload is invalid', async () => {
    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const respond = jest.fn();
    const subscription = {
      [Symbol.asyncIterator]: async function* () {
        await Promise.resolve();
        yield {
          data: Buffer.from('{invalid'),
          respond,
        };
      },
    } as unknown as Subscription;

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);
    const warnSpy = jest
      .spyOn(testableService.logger, 'warn')
      .mockImplementation();

    await testableService.consumeMessages(subscription);

    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring cost request with invalid payload',
    );
    const response = JSON.parse(
      (respond.mock.calls[0] as [Buffer])[0].toString('utf8'),
    ) as { dataSizeAtRest: number };
    expect(response).toEqual({ dataSizeAtRest: 0 });
    expect(
      testableService.extractTenantId(Buffer.from('{invalid')),
    ).toBeUndefined();
  });

  it('returns zero when cost processing fails', async () => {
    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const respond = jest.fn();
    const subscription = {
      [Symbol.asyncIterator]: async function* () {
        await Promise.resolve();
        yield {
          data: Buffer.from(
            JSON.stringify({
              tenant_id: '00000000-0000-0000-0000-000000000001',
            }),
          ),
          respond,
        };
      },
    } as unknown as Subscription;

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      getTenantDataSizeAtRest: jest
        .fn()
        .mockRejectedValue(new Error('db down')),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);
    const errorSpy = jest
      .spyOn(testableService.logger, 'error')
      .mockImplementation();

    await testableService.consumeMessages(subscription);

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to process cost request on internal.cost',
      expect.any(Error),
    );
    const response = JSON.parse(
      (respond.mock.calls[0] as [Buffer])[0].toString('utf8'),
    ) as { dataSizeAtRest: number };
    expect(response).toEqual({ dataSizeAtRest: 0 });
  });

  it('logs errors when replying to a message fails', () => {
    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);
    const errorSpy = jest
      .spyOn(testableService.logger, 'error')
      .mockImplementation();

    const respond = jest.fn(() => {
      throw new Error('response channel closed');
    });

    testableService.respondWithCost({ respond }, 512);

    expect(respond).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to respond to internal.cost request',
      expect.any(Error),
    );
  });

  it('builds connection options with token and TLS', () => {
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
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);

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

  it('logs TLS loading errors and keeps options without tls payload', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_URL: 'nats://localhost:4222',
      NATS_TLS_CA: '/tmp/ca.pem',
      NATS_TLS_CERT: '/tmp/cert.pem',
      NATS_TLS_KEY: '/tmp/key.pem',
    };

    const readFileSync = jest.fn(() => {
      throw new Error('unable to read certificate');
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
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);
    const errorSpy = jest
      .spyOn(testableService.logger, 'error')
      .mockImplementation();

    const options = testableService.buildConnectionOptions();

    expect(readFileSync).toHaveBeenCalled();
    expect((options as { tls?: unknown }).tls).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to load NATS TLS certificates: unable to read certificate',
    );
  });

  it('builds connection options with basic auth when token is not set', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_SERVERS: ' nats://one:4222, , nats://two:4222 ',
      NATS_USER: ' user ',
      NATS_PASSWORD: ' pass ',
    };

    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);

    expect(testableService.buildConnectionOptions()).toEqual({
      servers: ['nats://one:4222', 'nats://two:4222'],
      name: 'data-api',
      user: 'user',
      pass: 'pass',
    });
  });

  it('uses localhost NATS server by default when no server variables are provided', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NATS_URL: undefined,
      NATS_SERVERS: undefined,
    };

    jest.doMock('nats', () => ({
      connect: jest.fn(),
    }));

    const ServiceClass = loadServiceClass();
    const service = new ServiceClass({
      getTenantDataSizeAtRest: jest.fn(),
    } as unknown as MeasurePersistenceService);
    const testableService = asTestableService(service);

    expect(testableService.buildConnectionOptions()).toEqual({
      servers: ['nats://localhost:4222'],
      name: 'data-api',
    });
  });
});
