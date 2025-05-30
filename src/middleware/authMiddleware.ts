import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { prisma } from "../utils/db";
import asyncHandler from "express-async-handler";




const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401);
        throw new Error("No token provided or invalid token format");
      }

      const token = authHeader.split(" ")[1];

    
      const secret: Secret = process.env.JWT_SECRET!;
      if (!secret) {
        res.status(500);
        throw new Error("JWT secret is not configured");
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;
      if (!decoded.id) {
        res.status(401);
        throw new Error("Invalid token payload");
      }

      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
        }
      });

      if (!user) {
        res.status(401);
        throw new Error("User no longer exists");
      }

      
      req.user = user;
      next();

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401);
        throw new Error("Invalid or expired token");
      }
      throw error;
    }
  }
);

const admin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Authentication required");
  }
  
  if (!req.user.isAdmin) {
    res.status(403);
    throw new Error("Requires admin privileges");
  }

  next();
});

export { protect, admin };