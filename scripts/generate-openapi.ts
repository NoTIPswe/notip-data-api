import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { mkdirSync, writeFileSync } from 'node:fs';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { MeasureController } from '../src/data-api/controller/measure.controller';
import { SensorController } from '../src/data-api/controller/sensor.controller';
import { MeasureService } from '../src/data-api/services/measure.service';
import { SensorService } from '../src/data-api/services/sensor.service';
import { StreamListenerService } from '../src/data-api/services/stream-listener.service';

type YamlModule = {
  dump: (
    obj: unknown,
    options?: {
      noRefs?: boolean;
      lineWidth?: number;
    },
  ) => string;
};

// `require` keeps this script independent from ambient type packages.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require('js-yaml') as YamlModule;

const OUTPUT_DIR = 'api-contracts/openapi';
const OUTPUT_FILE = `${OUTPUT_DIR}/openapi.yaml`;

async function generateOpenApi(): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    controllers: [AppController, MeasureController, SensorController],
    providers: [
      { provide: AppService, useValue: {} },
      { provide: MeasureService, useValue: {} },
      { provide: SensorService, useValue: {} },
      { provide: StreamListenerService, useValue: {} },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const config = new DocumentBuilder()
    .setTitle('NoTIP Data API')
    .setDescription('NoTIP Data API OpenAPI specification')
    .setVersion(process.env.npm_package_version ?? '1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const yamlString = yaml.dump(document, { noRefs: true });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, yamlString, 'utf8');

  await app.close();
  console.log(`OpenAPI spec written to ${OUTPUT_FILE}`);
}

generateOpenApi().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
