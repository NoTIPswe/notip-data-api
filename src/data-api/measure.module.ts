import { Module } from '@nestjs/common';
import { MeasureService } from './services/measure.service';
import { MeasureController } from './controller/measure.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasureEntity } from './entity/measure.entity';
import { MeasurePersistenceService } from './services/measure.persistence.service';

@Module({
  imports: [TypeOrmModule.forFeature([MeasureEntity])],
  controllers: [MeasureController],
  providers: [MeasureService, MeasurePersistenceService],
})
export class MeasureModule {}
