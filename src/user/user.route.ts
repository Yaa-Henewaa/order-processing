import express from 'express';
import { loginHandler,registerHandler } from './user.controller';
import {admin,protect} from '../middleware/authMiddleware';

const router = express.Router();

router.get("/",protect,admin, registerHandler);
router.post("/",registerHandler);
router.post('/login', loginHandler);

export {router as userRoutes};