import { DataSource } from 'typeorm';

describe('data source', () => {
  const originalEnv = process.env;

  function loadDataSourceWithEnv(env: NodeJS.ProcessEnv): DataSource {
    process.env = env;
    jest.resetModules();

    let dataSource!: DataSource;
    jest.isolateModules(() => {
      dataSource =
        jest.requireActual<typeof import('./data-source')>(
          './data-source',
        ).default;
    });

    return dataSource;
  }

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('uses default database options when env is missing or invalid', () => {
    const dataSource = loadDataSourceWithEnv({
      ...originalEnv,
      MEASURES_DB_HOST: undefined,
      MEASURES_DB_PORT: 'invalid',
      MEASURES_DB_USER: undefined,
      MEASURES_DB_PASSWORD: undefined,
      MEASURES_DB_NAME: undefined,
      DB_SSL: 'false',
    });

    const options = dataSource.options as {
      type: string;
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      ssl: boolean;
      entities: string[];
      migrations: string[];
    };

    expect(options.type).toBe('postgres');
    expect(options.host).toBe('localhost');
    expect(options.port).toBe(5432);
    expect(options.username).toBe('postgres');
    expect(options.password).toBe('postgres');
    expect(options.database).toBe('postgres');
    expect(options.ssl).toBe(false);
    expect(options.entities).toHaveLength(1);
    expect(options.entities[0]).toContain('*.entity.{ts,js}');
    expect(options.migrations).toHaveLength(2);
    expect(options.migrations[0]).toContain('migrations');
    expect(options.migrations[1]).toContain('migrations');
  });

  it('uses environment-provided options and SSL when DB_SSL is 1', () => {
    const dataSource = loadDataSourceWithEnv({
      ...originalEnv,
      MEASURES_DB_HOST: 'db.internal',
      MEASURES_DB_PORT: '6543',
      MEASURES_DB_USER: 'app_user',
      MEASURES_DB_PASSWORD: 'secret',
      MEASURES_DB_NAME: 'app_db',
      DB_SSL: '1',
    });

    const options = dataSource.options as {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      ssl: boolean;
    };

    expect(options.host).toBe('db.internal');
    expect(options.port).toBe(6543);
    expect(options.username).toBe('app_user');
    expect(options.password).toBe('secret');
    expect(options.database).toBe('app_db');
    expect(options.ssl).toBe(true);
  });

  it('enables SSL when DB_SSL is true', () => {
    const dataSource = loadDataSourceWithEnv({
      ...originalEnv,
      MEASURES_DB_PORT: '5432',
      DB_SSL: 'true',
    });

    const options = dataSource.options as { ssl: boolean };
    expect(options.ssl).toBe(true);
  });
});
