import { Test, TestingModule } from '@nestjs/testing';
import { MeasureController } from './measure.controller';
import { MeasureService } from './../services/measure.service';
import { MeasureMapper } from './../measure.mapper';

//raggruppa tutti i test del controller
describe('MeasureController', () => {
  let controller: MeasureController; //istanza reale del controller da testare
  let service: jest.Mocked<MeasureService>; //versione mockata del MeasureService

  const mockMeasureService = {
    //creazione del mock del service
    query: jest.fn(),
    export: jest.fn(),
  };

  beforeEach(async () => {
    //setup prima di ogni unit test
    const module: TestingModule = await Test.createTestingModule({
      //creazione di un modulo Nest finto
      controllers: [MeasureController],
      providers: [
        {
          provide: MeasureService,
          useValue: mockMeasureService, //sostituisce il vero service con il mock
        },
      ],
    }).compile();

    controller = module.get<MeasureController>(MeasureController); //il controller viene creato con dentro il service mockato
    service = module.get(MeasureService);
  });

  afterEach(() => {
    jest.clearAllMocks(); //alla fine diu ogni test pulizia
  });

  describe('query', () => {
    //test del metodo query
    it('should call service.query with the correct input and return mapped response', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z'; //simulazione parametri HTTP
      const limit = '500';
      const gatewayId = ['gw-1', 'gw-2'];
      const sensorId = ['s-1', 's-2'];
      const sensorType = ['temp', 'hum'];
      const cursor = 'next-cursor';

      const queryModel = {
        //finto risultato
        items: [{ id: '1' }],
        cursor: 'next-cursor',
      };

      const queryResponseDto = {
        data: [{ id: '1' }],
        cursor: 'next-cursor',
      };

      service.query.mockResolvedValue(queryModel as any); //quando il controller chiama service.query, restituisci queryModel

      const mapperSpy = jest
        .spyOn(MeasureMapper, 'toQueryResponseDto')
        .mockReturnValue(queryResponseDto as any); //spia sul mapper

      const result = await controller.query(
        from,
        to,
        limit,
        gatewayId,
        sensorId,
        sensorType,
        cursor,
      );

      expect(service.query).toHaveBeenCalledTimes(1);
      expect(service.query).toHaveBeenCalledWith({
        from,
        to,
        limit: 500,
        gatewayId,
        sensorId,
        sensorType,
        cursor,
      });

      expect(mapperSpy).toHaveBeenCalledTimes(1);
      expect(mapperSpy).toHaveBeenCalledWith(queryModel);
      expect(result).toEqual(queryResponseDto);
    });

    it('should use default limit = 1000 when limit is not provided', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z';

      const queryModel = {
        items: [],
        cursor: null,
      };

      const queryResponseDto = {
        data: [],
        cursor: null,
      };

      service.query.mockResolvedValue(queryModel as any);

      jest
        .spyOn(MeasureMapper, 'toQueryResponseDto')
        .mockReturnValue(queryResponseDto as any);

      const result = await controller.query(
        from,
        to,
        undefined as any,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(service.query).toHaveBeenCalledTimes(1);
      expect(service.query).toHaveBeenCalledWith({
        from,
        to,
        limit: 1000,
        gatewayId: undefined,
        sensorId: undefined,
        sensorType: undefined,
        cursor: undefined,
      });

      expect(result).toEqual(queryResponseDto);
    });
  });

  describe('export', () => {
    it('should call service.export with the correct input and return mapped response', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z';
      const gatewayId = ['gw-1'];
      const sensorId = ['s-1'];
      const sensorType = ['temp'];

      const exportModel = [{ encryptedData: 'abc123' }];

      const exportResponseDto = [{ payload: 'abc123' }];

      service.export.mockResolvedValue(exportModel as any);

      const mapperSpy = jest
        .spyOn(MeasureMapper, 'toExportResponseDto')
        .mockReturnValue(exportResponseDto as any);

      const result = await controller.export(
        from,
        to,
        gatewayId,
        sensorId,
        sensorType,
      );

      expect(service.export).toHaveBeenCalledTimes(1);
      expect(service.export).toHaveBeenCalledWith({
        from,
        to,
        gatewayId,
        sensorId,
        sensorType,
      });

      expect(mapperSpy).toHaveBeenCalledTimes(1);
      expect(mapperSpy).toHaveBeenCalledWith(exportModel);
      expect(result).toEqual(exportResponseDto);
    });

    it('should call service.export with undefined optional filters when not provided', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z';

      const exportModel: any[] = [];
      const exportResponseDto: any[] = [];

      service.export.mockResolvedValue(exportModel as any);

      jest
        .spyOn(MeasureMapper, 'toExportResponseDto')
        .mockReturnValue(exportResponseDto as any);

      const result = await controller.export(
        from,
        to,
        undefined,
        undefined,
        undefined,
      );

      expect(service.export).toHaveBeenCalledTimes(1);
      expect(service.export).toHaveBeenCalledWith({
        from,
        to,
        gatewayId: undefined,
        sensorId: undefined,
        sensorType: undefined,
      });

      expect(result).toEqual(exportResponseDto);
    });
  });
});
