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
        const isNullOrUndefined = (val: any) => val === null || val === undefined;

        if (isNullOrUndefined(data)) {
          throw new NotFoundException('Requested resource was not found');
        }

        // If response has 'data' field, check that too
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          isNullOrUndefined(data.data)
        ) {
          throw new NotFoundException('Requested resource was not found');
        }
      }),
    );
  }
}
