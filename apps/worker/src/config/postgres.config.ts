import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Booking } from 'api/src/entities/booking.entity';
import { Location } from 'api/src/entities/location.entity';
import { Organization } from 'api/src/entities/organization.entity';
import { OrganizationHost } from 'api/src/entities/organization-host.entity';
import { Resource } from 'api/src/entities/resource.entity';
import { User } from 'api/src/entities/user.entity';

export interface PostgresConfig {
  url?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export const postgresConfig = registerAs(
  'postgres',
  (): PostgresConfig => ({
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    database: process.env.DATABASE_NAME ?? 'booker',
  }),
);

export function typeOrmOptionsFromPostgres(
  pg: PostgresConfig,
): TypeOrmModuleOptions {
  const common: TypeOrmModuleOptions = {
    type: 'postgres',
    entities: [Booking, Resource, User, Organization, OrganizationHost, Location],
    synchronize: false,
    retryAttempts: 5,
    retryDelay: 2000,
  };
  if (pg.url) {
    return { ...common, url: pg.url };
  }
  return {
    ...common,
    host: pg.host,
    port: pg.port,
    username: pg.username,
    password: pg.password,
    database: pg.database,
  };
}
