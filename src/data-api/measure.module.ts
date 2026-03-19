import { Module } from '@nestjs/common';
import { MeasureService } from './services/measure.service';
import { MeasureController } from './controller/measure.controller';

@Module({
  controllers: [MeasureController],
  providers: [MeasureService],
})
export class MeasureModule {}
