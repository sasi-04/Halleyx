import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import router from './routes';
import { ExecutionService } from './services/executionService';
import { RequestService } from './services/requestService';
import { setExecutionService } from './controllers/executionController';
import { setRequestService } from './controllers/requestController';
import { EmailService } from "./services/emailService";

dotenv.config();

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', router);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}

export function createServer() {
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  const emailService = new EmailService();
  const executionService = new ExecutionService(io, emailService);
  const requestService = new RequestService(executionService);
  setExecutionService(executionService);
  setRequestService(requestService);

  io.on('connection', (socket) => {
    socket.on('execution:subscribe', (executionId: string) => {
      socket.join(`execution:${executionId}`);
    });
    socket.on('execution:unsubscribe', (executionId: string) => {
      socket.leave(`execution:${executionId}`);
    });
  });

  return { server, io };
}

