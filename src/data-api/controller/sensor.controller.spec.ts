import { Test, TestingModule } from '@nestjs/testing';
import { SensorController } from './sensor.controller';
import { SensorService } from '../services/sensor.service';
import { MeasureMapper } from '../measure.mapper';

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

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('maps sensor list with gateway filter', async () => {
    const sensorModels = [
      {
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        lastSeen: '2026-03-23T09:58:00.000Z',
      },
    ];
    const sensorDtos = [
      {
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        lastSeen: '2026-03-23T09:58:00.000Z',
      },
    ];

    mockSensorService.getSensors.mockResolvedValue(sensorModels);
    const mapperSpy = jest
      .spyOn(MeasureMapper, 'toSensorDtos')
      .mockReturnValue(sensorDtos);

    const result = await controller.getSensors('gw-1', 'tenant-1');

    expect(mockSensorService.getSensors).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      gatewayId: 'gw-1',
    });
    expect(mapperSpy).toHaveBeenCalledWith(sensorModels);
    expect(result).toEqual(sensorDtos);
  });

  it('maps sensor list without gateway filter', async () => {
    mockSensorService.getSensors.mockResolvedValue([]);

    await controller.getSensors(undefined, 'tenant-1');

    expect(mockSensorService.getSensors).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      gatewayId: undefined,
    });
  });
});
