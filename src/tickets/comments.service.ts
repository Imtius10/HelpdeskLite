import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../users/user.interface.js';
import { Comment } from './comment.interface.js';
import { CommentsRepository } from './comments.repository.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { TicketsService } from './tickets.service.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly ticketsService: TicketsService,
  ) {}

  list(ticketId: number, user: User): Comment[] {
    this.ticketsService.getAccessibleTicket(ticketId, user);

    return this.commentsRepository.findByTicket(ticketId);
  }

  create(ticketId: number, dto: CreateCommentDto, user: User): Comment {
    this.ticketsService.getAccessibleTicket(ticketId, user);

    return this.commentsRepository.create(ticketId, user.id, dto.body);
  }

  remove(ticketId: number, commentId: number, user: User): void {
    this.ticketsService.getAccessibleTicket(ticketId, user);

    const comment = this.commentsRepository.findById(commentId);

    if (!comment || comment.ticketId !== ticketId) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const isStaff = user.role === 'AGENT' || user.role === 'ADMIN';

    if (!isStaff && comment.author.id !== user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    this.commentsRepository.remove(commentId);
  }
}
