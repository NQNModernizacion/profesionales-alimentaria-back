import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CrearSolicitudDto {
  // Datos personales (snapshot declarado)
  @ApiProperty() @IsString() @IsNotEmpty() nombre: string;
  @ApiProperty() @IsString() @IsNotEmpty() apellido: string;
  @ApiProperty() @IsString() @IsNotEmpty() dni: string;
  @ApiProperty() @IsString() @IsNotEmpty() cuit: string;
  @ApiProperty() @IsString() @IsNotEmpty() fechaNacimiento: string;
  @ApiProperty() @IsString() @IsNotEmpty() domicilio: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() telefono: string;

  // Datos profesionales
  @ApiProperty() @IsString() @IsNotEmpty() tituloId: string;
  @ApiProperty() @IsString() @IsNotEmpty() matricula: string;
  @ApiProperty() @IsBoolean() matriculaVigente: boolean;

  // Áreas de servicio
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  areas: string[];

  @ApiProperty() @IsOptional() @IsString() areasOtros: string;

  // Declaraciones
  @ApiProperty() @IsBoolean() aceptaDDJJ: boolean;
  @ApiProperty() @IsBoolean() consientePublicacion: boolean;
}
