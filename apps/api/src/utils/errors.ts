/**
 * Custom error classes for structured API error handling.
 * The global error handler in index.ts uses the statusCode property
 * to send the correct HTTP status.
 */

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, 400);
    this.fieldErrors = fieldErrors;
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}

export class UsageLimitError extends AppError {
  public readonly plan: string;
  public readonly currentUsage: number;
  public readonly limit: number;

  constructor(plan: string, currentUsage: number, limit: number) {
    super(
      `Monthly scan limit reached. Your ${plan} plan allows ${limit} scans per month (used: ${currentUsage}).`,
      429
    );
    this.plan = plan;
    this.currentUsage = currentUsage;
    this.limit = limit;
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}
