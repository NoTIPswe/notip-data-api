import { Module } from '@nestjs/common';
import { SensorService } from './services/sensor.service';
import { SensorController } from './controller/sensor.controller';
import { MeasurePersistenceService } from './services/measure.persistence.service';
import { NP_QUERY_PERSISTENCE } from './interfaces/np-query-persistence.token';

@Module({
  controllers: [SensorController],
  providers: [
    SensorService,
    MeasurePersistenceService,
    {
      provide: NP_QUERY_PERSISTENCE,
      useExisting: MeasurePersistenceService,
    },
  ],
})
export class SensorModule {}
