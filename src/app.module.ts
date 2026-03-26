import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeasureModule } from './data-api/measure.module';
import { SensorModule } from './data-api/sensor.module';

@Module({
  imports: [MeasureModule, SensorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
