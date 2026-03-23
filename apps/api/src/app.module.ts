import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import {
  postgresConfig,
  typeOrmOptionsFromPostgres,
  type PostgresConfig,
} from './config';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { ResourcesModule } from './resources/resources.module';
import { PlatformModule } from './platform/platform.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [postgresConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pg = config.getOrThrow<PostgresConfig>('postgres');
        return typeOrmOptionsFromPostgres(pg);
      },
    }),
    HealthModule,
    AuthModule,
    LocationsModule,
    ResourcesModule,
    BookingsModule,
    UsersModule,
    PlatformModule,
  ],
})
export class AppModule {}
