import { Module } from '@nestjs/common';
import { SensorService } from './services/sensor.service';
import { SensorController } from './controller/sensor.controller';
import { MeasurePersistenceService } from './services/measure.persistence.service';

@Module({
  controllers: [SensorController],
  providers: [
    SensorService,
    MeasurePersistenceService,
    {
      provide: 'NpQueryPersistenceService',
      useExisting: MeasurePersistenceService,
    },
  ],
})
export class MeasureModule {}