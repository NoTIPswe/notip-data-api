import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeasureModule } from './data-api/measure.module';
import { SensorModule } from './data-api/sensor.module';

function parseSslFlag(value?: string): boolean {
  return value === 'true' || value === '1';
}

function buildTypeOrmOptions(): TypeOrmModuleOptions {
  const {
    MEASURES_DB_HOST,
    MEASURES_DB_PORT,
    MEASURES_DB_USER,
    MEASURES_DB_PASSWORD,
    MEASURES_DB_NAME,
    DB_SSL,
  } = process.env;

  if (
    !MEASURES_DB_HOST ||
    !MEASURES_DB_PORT ||
    !MEASURES_DB_USER ||
    !MEASURES_DB_NAME
  ) {
    throw new Error(
      'Missing TypeORM database configuration. Set MEASURES_DB_HOST, MEASURES_DB_PORT, MEASURES_DB_USER and MEASURES_DB_NAME.',
    );
  }

  return {
    type: 'postgres' as const,
    host: MEASURES_DB_HOST,
    port: Number.parseInt(MEASURES_DB_PORT, 10),
    username: MEASURES_DB_USER,
    password: MEASURES_DB_PASSWORD,
    database: MEASURES_DB_NAME,
    ssl: parseSslFlag(DB_SSL),
    autoLoadEntities: true,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => buildTypeOrmOptions(),
    }),
    MeasureModule,
    SensorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
