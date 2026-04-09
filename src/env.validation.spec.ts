import { validate } from './env.validation';

describe('validate', () => {
  it('parses numeric and boolean environment values outside test mode', () => {
    expect(
      validate({
        NODE_ENV: 'development',
        DATA_API_PORT: '3001',
        MEASURES_DB_HOST: 'db.example.local',
        MEASURES_DB_PORT: '6543',
        MEASURES_DB_USER: 'postgres',
        MEASURES_DB_PASSWORD: 'secret',
        MEASURES_DB_NAME: 'measures',
        DB_SSL: '1',
        NATS_URL: 'nats://localhost:4222',
      }),
    ).toEqual({
      DATA_API_PORT: 3001,
      MEASURES_DB_HOST: 'db.example.local',
      MEASURES_DB_PORT: 6543,
      MEASURES_DB_USER: 'postgres',
      MEASURES_DB_PASSWORD: 'secret',
      MEASURES_DB_NAME: 'measures',
      DB_SSL: true,
      NATS_URL: 'nats://localhost:4222',
      NATS_SERVERS: undefined,
      NATS_TOKEN: undefined,
      NATS_USER: undefined,
      NATS_PASSWORD: undefined,
      NATS_TLS_CA: undefined,
      NATS_TLS_CERT: undefined,
      NATS_TLS_KEY: undefined,
      MGMT_API_URL: 'https://management-api:3000',
    });
  });

  it('throws when required database environment variables are missing outside test mode', () => {
    expect(() =>
      validate({
        NODE_ENV: 'development',
        MEASURES_DB_PORT: '5432',
        MEASURES_DB_USER: 'postgres',
        MEASURES_DB_NAME: 'measures',
      }),
    ).toThrow('Missing environment variable: MEASURES_DB_HOST');
  });

  it('throws when numeric variables are invalid', () => {
    expect(() =>
      validate({
        NODE_ENV: 'development',
        DATA_API_PORT: 'abc',
        MEASURES_DB_HOST: 'localhost',
        MEASURES_DB_PORT: '5432',
        MEASURES_DB_USER: 'postgres',
        MEASURES_DB_NAME: 'measures',
      }),
    ).toThrow('Invalid numeric environment variable: DATA_API_PORT');

    expect(() =>
      validate({
        NODE_ENV: 'development',
        MEASURES_DB_HOST: 'localhost',
        MEASURES_DB_PORT: 'abc',
        MEASURES_DB_USER: 'postgres',
        MEASURES_DB_NAME: 'measures',
      }),
    ).toThrow('Invalid numeric environment variable: MEASURES_DB_PORT');
  });

  it('uses test defaults when database environment variables are omitted', () => {
    expect(
      validate({
        NODE_ENV: 'test',
        DB_SSL: 'false',
      }),
    ).toEqual({
      DATA_API_PORT: undefined,
      MEASURES_DB_HOST: 'localhost',
      MEASURES_DB_PORT: 5432,
      MEASURES_DB_USER: 'test',
      MEASURES_DB_PASSWORD: undefined,
      MEASURES_DB_NAME: 'test',
      DB_SSL: false,
      NATS_URL: undefined,
      NATS_SERVERS: undefined,
      NATS_TOKEN: undefined,
      NATS_USER: undefined,
      NATS_PASSWORD: undefined,
      NATS_TLS_CA: undefined,
      NATS_TLS_CERT: undefined,
      NATS_TLS_KEY: undefined,
      MGMT_API_URL: 'https://management-api:3000',
    });
  });
});
