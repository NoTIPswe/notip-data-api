import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'node:path';

const port = Number(process.env.MEASURES_DB_PORT);
const ssl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

export default new DataSource({
  type: 'postgres',
  host: process.env.MEASURES_DB_HOST ?? 'localhost',
  port: Number.isNaN(port) ? 5432 : port,
  username: process.env.MEASURES_DB_USER ?? 'postgres',
  password: process.env.MEASURES_DB_PASSWORD ?? 'postgres',
  database: process.env.MEASURES_DB_NAME ?? 'postgres',
  ssl,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [
    join(__dirname, '..', 'migrations', '*.ts'),
    join(__dirname, '..', 'migrations', '*.js'),
  ],
});
