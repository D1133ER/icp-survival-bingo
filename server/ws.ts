import { Server as IOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { corsOrigins } from './config';

let io: IOServer | null = null;

export function initIO(httpServer: HTTPServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: corsOrigins.length > 0 ? corsOrigins : '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // Client joins a game room by code
    socket.on('join-room', (code: string) => {
      if (typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code.toUpperCase())) {
        socket.join(code.toUpperCase());
      }
    });

    socket.on('leave-room', (code: string) => {
      if (typeof code === 'string') {
        socket.leave(code.toUpperCase());
      }
    });
  });

  return io;
}

export function getIO(): IOServer | null {
  return io;
}
