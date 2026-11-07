import { Router } from 'express';
import {
  postChat,
  listChatsHandler,
  getMessagesHandler,
} from './chat.controller.js';

export const chatRouter = Router();
chatRouter.post('/chat', postChat);
chatRouter.get('/chats', listChatsHandler);
chatRouter.get('/chats/:id/messages', getMessagesHandler);
