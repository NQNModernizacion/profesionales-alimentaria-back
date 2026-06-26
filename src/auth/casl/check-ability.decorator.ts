import { SetMetadata } from '@nestjs/common';
import { Actions, Subjects } from './casl-ability.factory';

export interface RequiredAbility {
  action: Actions;
  subject: Subjects;
}

export const CHECK_ABILITY_KEY = 'checkAbility';

export const CheckAbility = (action: Actions, subject: Subjects) =>
  SetMetadata<string, RequiredAbility>(CHECK_ABILITY_KEY, { action, subject });
