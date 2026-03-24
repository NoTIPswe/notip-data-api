import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { IntegrationTestAppModule } from './integration-test-app.module';

describe('Data API integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00.000Z'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IntegrationTestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  const getRequest = () =>
    request(
      app.getHttpAdapter().getInstance() as Parameters<typeof request>[0],
    );

  it('/ (GET)', () => {
    return getRequest().get('/').expect(200).expect('Hello World!');
  });

  it('/measures/query (GET) returns paginated measures from the in-memory mock', async () => {
    const response = await getRequest()
      .get('/measures/query')
      .query({
        from: '2026-03-23T09:50:00.000Z',
        to: '2026-03-23T10:00:00.000Z',
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        limit: 1,
      })
      .expect(200);

    expect(response.body).toEqual({
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
    });
  });

  it('/measures/export (GET) returns all matching measures from the in-memory mock', async () => {
    const response = await getRequest()
      .get('/measures/export')
      .query({
        from: '2026-03-23T09:50:00.000Z',
        to: '2026-03-23T10:00:00.000Z',
        gatewayId: 'gw-1',
      })
      .expect(200);

    expect(response.body).toEqual([
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

  it('/measures/query (GET) rejects requests with limit greater than 1000', async () => {
    const response = await getRequest()
      .get('/measures/query')
      .query({
        from: '2026-03-23T09:50:00.000Z',
        to: '2026-03-23T10:00:00.000Z',
        limit: 1001,
      })
      .expect(400);

    expect(response.body).toEqual({
      message: {
        code: 'QUERY_LIMIT_EXCEEDED',
        message: 'limit must be less than or equal to 1000',
      },
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('/measures/query (GET) rejects requests with a window greater than 24 hours', async () => {
    const response = await getRequest()
      .get('/measures/query')
      .query({
        from: '2026-03-22T09:59:59.000Z',
        to: '2026-03-23T10:00:00.000Z',
        limit: 1000,
      })
      .expect(400);

    expect(response.body).toEqual({
      message: {
        code: 'QUERY_WINDOW_EXCEEDED',
        message: 'time window must be less than or equal to 24 hours',
      },
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('/measures/export (GET) rejects requests with a window greater than 24 hours', async () => {
    const response = await getRequest()
      .get('/measures/export')
      .query({
        from: '2026-03-22T09:59:59.000Z',
        to: '2026-03-23T10:00:00.000Z',
      })
      .expect(400);

    expect(response.body).toEqual({
      message: {
        code: 'EXPORT_WINDOW_EXCEEDED',
        message: 'time window must be less than or equal to 24 hours',
      },
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('/sensor (GET) returns unique sensors with the latest lastSeen', async () => {
    const response = await getRequest()
      .get('/sensor')
      .query({
        gatewayId: 'gw-1',
      })
      .expect(200);

    expect(response.body).toEqual([
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
