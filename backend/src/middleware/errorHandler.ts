import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload format or parameters.',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // A body express could not parse is the caller's mistake, not ours. Reporting
  // it as a 500 told the client the server had broken and filled the error log
  // with entries no one can act on.
  if (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
    res.status(400).json({
      error: {
        code: 'MALFORMED_JSON',
        message: 'The request body is not valid JSON.',
      },
    });
    return;
  }

  // Handle Custom Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle Internal Unhandled Errors safely without leaking stack traces
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
    },
  });
};
