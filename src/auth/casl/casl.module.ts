import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { CaslAbilityFactory } from './casl-ability.factory';
import { CaslAbilityGuard } from './casl-ability.guard';

@Module({
  imports: [DbModule],
  providers: [CaslAbilityFactory, CaslAbilityGuard],
  exports: [CaslAbilityFactory, CaslAbilityGuard],
})
export class CaslModule {}
