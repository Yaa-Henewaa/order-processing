// types/express.d.ts
import { User } from './user';

declare global {
  namespace Express {
  interface Request {
    user?: {
      id: string;
      name: string;
      email: string;
      isAdmin: boolean;
    };
  }
  }
}