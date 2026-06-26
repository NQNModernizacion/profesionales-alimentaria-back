import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SyncPermissionsDto {
  @ApiProperty({
    type: [Number],
    description: 'IDs de permisos a asignar (reemplaza los existentes)',
    example: [1, 3, 5],
  })
  @IsArray()
  @IsInt({ each: true })
  permission_ids: number[];
}
