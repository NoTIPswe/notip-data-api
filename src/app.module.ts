import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeasureModule } from './data-api/measure.module';

@Module({
  imports: [MeasureModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
