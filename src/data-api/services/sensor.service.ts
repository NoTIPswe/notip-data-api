import { Injectable } from '@nestjs/common';
import { NpQueryPersistenceService } from './../interfaces/np-query-persistence.service';

@Injectable()
export class SensorService {
    constructor(private readonly npqps: NpQueryPersistenceService) {}

    //rendi l'interfaccia Np una abstract class
}
