import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { UsersModule } from './users/users.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const observeAppKey = process.env.OBSERVE_APP_KEY;
const observeAppSecret = process.env.OBSERVE_APP_SECRET;

export const observeEnabled = Boolean(observeAppKey && observeAppSecret);

@Module({
  imports: [
    ...(observeEnabled
      ? [
          ObserveModule.forRoot({
            appKey: observeAppKey as string,
            appSecret: observeAppSecret as string,
            serviceId: process.env.OBSERVE_SERVICE_ID ?? 'helpdesk-lite',
          }),
        ]
      : []),
    DatabaseModule,
    UsersModule,
    AuthModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
