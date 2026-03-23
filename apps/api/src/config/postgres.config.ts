import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface PostgresConfig {
  url?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
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
    synchronize: (process.env.NODE_ENV ?? 'development') !== 'production',
  }),
);

export function typeOrmOptionsFromPostgres(
  pg: PostgresConfig,
): TypeOrmModuleOptions {
  const common: TypeOrmModuleOptions = {
    type: 'postgres',
    autoLoadEntities: true,
    synchronize: pg.synchronize,
    retryAttempts: 5,
    retryDelay: 2000,
    extra: {
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    },
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
