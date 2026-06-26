import { Request } from 'express';
import { AdminUser } from './auth.types';

export interface IAuthStrategy {
  authenticate(
    dto: { _id?: string; password?: string },
    request?: Request,
  ): Promise<AdminUser>;
}
