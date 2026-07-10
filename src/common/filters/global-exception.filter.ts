import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : process.env.NODE_ENV === 'development' && exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const errorMessage =
      typeof message === 'object' && message !== null
        ? (message as any).message || message
        : message;

    // Log full stack in dev for debugging
    if (!(exception instanceof HttpException) && exception instanceof Error) {
      this.logger.error(`Stack: ${exception.stack}`);
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(errorMessage)}`,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: errorMessage,
    });
  }
}
