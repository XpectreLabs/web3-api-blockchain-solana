import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  NotFoundException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Intercepts null values returned by controllers and throws a 404 NotFoundException automatically.
 */
@Injectable()
export class NullToNotFoundInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        if (data === null || data === undefined) {
          throw new NotFoundException('Requested resource was not found');
        }
      }),
    );
  }
}
