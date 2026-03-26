import { Test, TestingModule } from '@nestjs/testing';
import { SensorController } from './sensor.controller';
import { SensorService } from '../services/sensor.service';

describe('SensorController', () => {
  let controller: SensorController;

  const mockSensorService = {
    getSensors: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorController],
      providers: [
        {
          provide: SensorService,
          useValue: mockSensorService,
        },
      ],
    }).compile();

    controller = module.get<SensorController>(SensorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
