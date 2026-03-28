import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { Booking } from './entities/booking.entity';
import { BookingNotificationProcessor } from './booking-notification.processor';
import {
  postgresConfig,
  typeOrmOptionsFromPostgres,
  redisConfig,
  mailerConfig,
  type PostgresConfig,
  type RedisConfig,
  type MailerConfig,
} from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [postgresConfig, redisConfig, mailerConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pg = config.getOrThrow<PostgresConfig>('postgres');
        return typeOrmOptionsFromPostgres(pg);
      },
    }),
    TypeOrmModule.forFeature([Booking]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = config.getOrThrow<RedisConfig>('redis');
        return { connection: { url: redis.url } };
      },
    }),
    BullModule.registerQueue({ name: 'booking-notifications' }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mail = config.getOrThrow<MailerConfig>('mailer');
        return {
          transport: {
            host: mail.host,
            port: mail.port,
            auth: { user: mail.user, pass: mail.pass },
          },
          defaults: { from: mail.from },
        };
      },
    }),
  ],
  providers: [BookingNotificationProcessor],
})
export class AppModule {}
