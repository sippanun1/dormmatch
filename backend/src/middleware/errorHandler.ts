import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation error",
      details: JSON.parse(err.message),
    });
  }

  return res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
}
