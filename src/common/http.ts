import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const problem = (
  status: number,
  code: string,
  message: string,
  errors?: unknown,
): DomainError => new DomainError(status, code, message, errors);

export function requestId(request: FastifyRequest): string {
  const value = request.headers['x-request-id'];
  return typeof value === 'string' && value.length > 0 ? value : 'request-local';
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const id = requestId(request);

    if (exception instanceof DomainError) {
      reply.status(exception.status).send({
        type: `https://medical-tourism.dev/problems/${exception.code}`,
        title: exception.code,
        status: exception.status,
        detail: exception.message,
        code: exception.code,
        requestId: id,
        ...(exception.errors ? { errors: exception.errors } : {}),
      });
      return;
    }

    if (exception instanceof ZodError) {
      reply.status(400).send({
        type: 'https://medical-tourism.dev/problems/VALIDATION_ERROR',
        title: 'VALIDATION_ERROR',
        status: 400,
        detail: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        errors: exception.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        requestId: id,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      reply.status(status).send({
        type: 'https://medical-tourism.dev/problems/HTTP_ERROR',
        title: 'HTTP_ERROR',
        status,
        detail: exception.message,
        code: 'HTTP_ERROR',
        requestId: id,
      });
      return;
    }

    reply.status(500).send({
      type: 'https://medical-tourism.dev/problems/INTERNAL_ERROR',
      title: 'INTERNAL_ERROR',
      status: 500,
      detail: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      requestId: id,
    });
  }
}

export function parse<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  return schema.parse(value);
}
