import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsRepository } from './comments.repository.js';
import { CommentsService } from './comments.service.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsRepository } from './tickets.repository.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [UsersModule],
  controllers: [TicketsController, CommentsController],
  providers: [
    TicketsService,
    TicketsRepository,
    CommentsService,
    CommentsRepository,
  ],
})
export class TicketsModule {}
