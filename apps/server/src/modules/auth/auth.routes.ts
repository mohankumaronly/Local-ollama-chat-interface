import { Router } from 'express';
import { verifyAuthHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.get('/verify', verifyAuthHandler);
