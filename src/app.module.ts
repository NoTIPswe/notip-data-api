import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeasureModule } from './data-api/measure.module';
import { SensorModule } from './data-api/sensor.module';
import { validate } from './env.validation';
import { TenantAccessGuard } from './auth/tenant-access.guard';

const databaseImports =
  process.env.NODE_ENV === 'test'
    ? []
    : [
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
            return {
              type: 'postgres',
              host: configService.get<string>('MEASURES_DB_HOST'),
              port: configService.get<number>('MEASURES_DB_PORT'),
              username: configService.get<string>('MEASURES_DB_USER'),
              password: configService.get<string>('MEASURES_DB_PASSWORD'),
              database: configService.get<string>('MEASURES_DB_NAME'),
              ssl: configService.get<boolean>('DB_SSL'),
              synchronize:
                configService.get<string>('NODE_ENV') !== 'production',
              autoLoadEntities: true,
            };
          },
        }),
      ];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      expandVariables: true,
    }),
    ...databaseImports,
    MeasureModule,
    SensorModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantAccessGuard,
    },
  ],
})
export class AppModule {}
