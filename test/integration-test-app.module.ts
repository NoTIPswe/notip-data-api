import { Module } from '@nestjs/common';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { MeasureController } from '../src/data-api/controller/measure.controller';
import { SensorController } from '../src/data-api/controller/sensor.controller';
import { NP_QUERY_PERSISTENCE } from '../src/data-api/interfaces/np-query-persistence.token';
import { MeasureService } from '../src/data-api/services/measure.service';
import { MeasurePersistenceService } from '../src/data-api/services/measure.persistence.service';
import { SensorService } from '../src/data-api/services/sensor.service';
import { StreamListenerService } from '../src/data-api/services/stream-listener.service';
import { InMemoryMeasurePersistenceService } from './mocks/in-memory-measure-persistence.service';
import { MockStreamListenerService } from './mocks/mock-stream-listener.service';

@Module({
  controllers: [AppController, MeasureController, SensorController],
  providers: [
    AppService,
    MeasureService,
    SensorService,
    {
      provide: MeasurePersistenceService,
      useClass: InMemoryMeasurePersistenceService,
    },
    {
      provide: NP_QUERY_PERSISTENCE,
      useExisting: MeasurePersistenceService,
    },
    {
      provide: StreamListenerService,
      useClass: MockStreamListenerService,
    },
  ],
})
export class IntegrationTestAppModule {}
