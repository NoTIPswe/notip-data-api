type DataApiEnv = {
  DATA_API_PORT?: number;
  MEASURES_DB_HOST: string;
  MEASURES_DB_PORT: number;
  MEASURES_DB_USER: string;
  MEASURES_DB_PASSWORD?: string;
  MEASURES_DB_NAME: string;
  DB_SSL: boolean;
  NATS_URL?: string;
  NATS_SERVERS?: string;
  NATS_TOKEN?: string;
  NATS_USER?: string;
  NATS_PASSWORD?: string;
  NATS_TLS_CA?: string;
  NATS_TLS_CERT?: string;
  NATS_TLS_KEY?: string;
  MGMT_API_URL: string;
};

function parseNumber(value: string | undefined, name: string): number {
  if (!value) {
    throw new TypeError(`Missing environment variable: ${name}`);
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new TypeError(`Invalid numeric environment variable: ${name}`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export function validate(config: NodeJS.ProcessEnv): DataApiEnv {
  const isTestEnvironment = config.NODE_ENV === 'test';
  const required = [
    'MEASURES_DB_HOST',
    'MEASURES_DB_PORT',
    'MEASURES_DB_USER',
    'MEASURES_DB_NAME',
  ] as const;

  if (!isTestEnvironment) {
    for (const key of required) {
      if (!config[key]) {
        throw new Error(`Missing environment variable: ${key}`);
      }
    }
  }

  return {
    DATA_API_PORT: config.DATA_API_PORT
      ? parseNumber(config.DATA_API_PORT, 'DATA_API_PORT')
      : undefined,
    MEASURES_DB_HOST: config.MEASURES_DB_HOST ?? 'localhost',
    MEASURES_DB_PORT: config.MEASURES_DB_PORT
      ? parseNumber(config.MEASURES_DB_PORT, 'MEASURES_DB_PORT')
      : 5432,
    MEASURES_DB_USER: config.MEASURES_DB_USER ?? 'test',
    MEASURES_DB_PASSWORD: config.MEASURES_DB_PASSWORD,
    MEASURES_DB_NAME: config.MEASURES_DB_NAME ?? 'test',
    DB_SSL: parseBoolean(config.DB_SSL),
    NATS_URL: config.NATS_URL,
    NATS_SERVERS: config.NATS_SERVERS,
    NATS_TOKEN: config.NATS_TOKEN,
    NATS_USER: config.NATS_USER,
    NATS_PASSWORD: config.NATS_PASSWORD,
    NATS_TLS_CA: config.NATS_TLS_CA,
    NATS_TLS_CERT: config.NATS_TLS_CERT,
    NATS_TLS_KEY: config.NATS_TLS_KEY,
    MGMT_API_URL: config.MGMT_API_URL ?? 'http://management-api:3000',
  };
}
