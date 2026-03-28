import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

export class AppException extends HttpException {
  constructor(errorCode: ErrorCode, status: HttpStatus) {
    super({ statusCode: status, errorCode }, status);
  }
}
