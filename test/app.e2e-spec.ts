import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { MeasureController } from '../src/data-api/controller/measure.controller';
import { SensorController } from '../src/data-api/controller/sensor.controller';
import { IntegrationTestAppModule } from './integration-test-app.module';

describe('Data API integration', () => {
  let app: INestApplication;
  let appController: AppController;
  let measureController: MeasureController;
  let sensorController: SensorController;

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00.000Z'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IntegrationTestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    appController = moduleFixture.get<AppController>(AppController);
    measureController = moduleFixture.get<MeasureController>(MeasureController);
    sensorController = moduleFixture.get<SensorController>(SensorController);
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  it('/ (GET)', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });

  it('/measures/query (GET) returns paginated measures from the in-memory mock', async () => {
    const response = await measureController.query(
      '2026-03-23T09:50:00.000Z',
      '2026-03-23T10:00:00.000Z',
      '1',
      ['gw-1'],
      ['sensor-1'],
      ['temperature'],
    );

    expect(response).toEqual([
      {
        data: [
          {
            gatewayId: 'gw-1',
            sensorId: 'sensor-1',
            sensorType: 'temperature',
            timestamp: '2026-03-23T09:58:00.000Z',
            encryptedData: 'enc-3',
            iv: 'iv-3',
            authTag: 'tag-3',
            keyVersion: 1,
          },
        ],
        nextCursor: '2026-03-23T09:58:00.000Z',
        hasMore: true,
      },
    ]);
  });

  it('/measures/export (GET) returns all matching measures from the in-memory mock', async () => {
    const response = await measureController.export(
      '2026-03-23T09:50:00.000Z',
      '2026-03-23T10:00:00.000Z',
      ['gw-1'],
    );

    expect(response).toEqual([
      {
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        timestamp: '2026-03-23T09:58:00.000Z',
        encryptedData: 'enc-3',
        iv: 'iv-3',
        authTag: 'tag-3',
        keyVersion: 1,
      },
      {
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        timestamp: '2026-03-23T09:55:00.000Z',
        encryptedData: 'enc-2',
        iv: 'iv-2',
        authTag: 'tag-2',
        keyVersion: 1,
      },
      {
        gatewayId: 'gw-1',
        sensorId: 'sensor-2',
        sensorType: 'humidity',
        timestamp: '2026-03-23T09:54:00.000Z',
        encryptedData: 'enc-1',
        iv: 'iv-1',
        authTag: 'tag-1',
        keyVersion: 2,
      },
    ]);
  });

  it('/measures/query (GET) rejects requests with limit greater than or equal to 1000', async () => {
    await expect(
      measureController.query(
        '2026-03-23T09:50:00.000Z',
        '2026-03-23T10:00:00.000Z',
        '1000',
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'QUERY_LIMIT_EXCEEDED',
        message: 'limit must be less than 1000',
      },
      status: 400,
    });
  });

  it('/measures/query (GET) rejects requests with a window greater than 24 hours', async () => {
    await expect(
      measureController.query(
        '2026-03-22T09:59:59.000Z',
        '2026-03-23T10:00:00.000Z',
        '999',
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'QUERY_WINDOW_EXCEEDED',
        message: 'time window must be less than or equal to 24 hours',
      },
      status: 400,
    });
  });

  it('/measures/export (GET) rejects requests with a window greater than 24 hours', async () => {
    await expect(
      measureController.export(
        '2026-03-22T09:59:59.000Z',
        '2026-03-23T10:00:00.000Z',
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'EXPORT_WINDOW_EXCEEDED',
        message: 'time window must be less than or equal to 24 hours',
      },
      status: 400,
    });
  });

  it('/sensor (GET) returns unique sensors with the latest lastSeen', async () => {
    const response = await sensorController.getSensors('gw-1');

    expect(response).toEqual([
      {
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        lastSeen: '2026-03-23T09:58:00.000Z',
      },
      {
        gatewayId: 'gw-1',
        sensorId: 'sensor-2',
        sensorType: 'humidity',
        lastSeen: '2026-03-23T09:54:00.000Z',
      },
    ]);
  });
});
