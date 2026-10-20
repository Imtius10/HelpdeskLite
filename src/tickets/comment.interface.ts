export interface CommentAuthor {
  id: number;
  name: string;
  email: string;
}

export interface Comment {
  id: number;
  ticketId: number;
  body: string;
  author: CommentAuthor;
  createdAt: string;
}
