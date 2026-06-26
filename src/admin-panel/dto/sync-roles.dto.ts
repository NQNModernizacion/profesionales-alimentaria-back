import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class SyncRolesDto {
  @ApiPropertyOptional({
    type: [Number],
    description: 'IDs de roles a asignar',
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  role_ids?: number[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Nombres de roles a asignar (alternativa a role_ids)',
    example: ['admin', 'operador'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles?: string[];

  @ValidateIf((o: SyncRolesDto) => !o.role_ids && !o.roles)
  _requireOneOf: never; // triggers if both are absent — handled in service
}
