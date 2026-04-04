import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelemetryData1775238000000 implements MigrationInterface {
  name = 'CreateTelemetryData1775238000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telemetry_data" (
        "time" TIMESTAMPTZ NOT NULL,
        "tenant_id" UUID NOT NULL,
        "gateway_id" UUID NOT NULL,
        "sensor_id" UUID NOT NULL,
        "sensor_type" VARCHAR(255) NOT NULL,
        "encrypted_data" VARCHAR(255) NOT NULL,
        "iv" VARCHAR(255) NOT NULL,
        "auth_tag" VARCHAR(255) NOT NULL,
        "key_version" INTEGER NOT NULL,
        CONSTRAINT "PK_telemetry_data_time" PRIMARY KEY ("time")
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_telemetry_data_tenant_time" ON "telemetry_data" ("tenant_id", "time" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_telemetry_data_gateway_time" ON "telemetry_data" ("gateway_id", "time" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_telemetry_data_sensor_time" ON "telemetry_data" ("sensor_id", "time" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_telemetry_data_sensor_type_time" ON "telemetry_data" ("sensor_type", "time" DESC)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_telemetry_data_sensor_type_time"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_telemetry_data_sensor_time"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_telemetry_data_gateway_time"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_telemetry_data_tenant_time"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "telemetry_data"');
  }
}
