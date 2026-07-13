import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum AuthType {
  INTERNAL = 'internal',
  ENTER_APP = 'enter_app',
  REFRESH_TOKEN = 'refresh_token',
  REFRESH_DATA = 'refresh_data',
  APP_LOGIN = 'app_login',
}

export class LoginDto {
  @ApiProperty({
    enum: AuthType,
    example: AuthType.INTERNAL,
    description: 'Tipo de autenticacion que se desea ejecutar',
  })
  @IsEnum(AuthType)
  @IsNotEmpty()
  type: AuthType;

  /**
   * Email or document number (for internal), user ID (for enter_app),
   * or undefined (for refresh strategies).
   */
  @ApiPropertyOptional({
    description:
      'Email o documento para internal, id de usuario para enter_app, u omitido para refresh',
    example: 'usuario@dominio.com',
  })
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiPropertyOptional({
    description: 'Contrasena para autenticacion internal cuando corresponda',
    example: 'MiPassword123',
  })
  @IsOptional()
  @IsString()
  password?: string;
}

export interface AdminUser {
  id: number;
  email: string;
  password: string;
  tokenWeblogin?: string | null;
  persona?: {
    id: number;
    documento: number;
    nombres: string;
    apellidos: string;
    nombreCompleto?: string | null;
    genero: string;
    celular?: string | null;
    correoElectronico?: string | null;
    direccionCompleta?: string | null;
    cuil?: string | null;
    fechaNacimiento?: string | null;
  } | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface JwtPayload {
  sub: number;
  email?: string;
  jti: string;
  type: 'access' | 'refresh';
  exp?: number;
  iat?: number;
}

export interface LoginResponse {
  token_type: 'Bearer';
  token: string;
  refresh_token: string;
  expires_at: string;
  user: {
    id: number;
    email: string;
    auth_method: AuthType;
    persona?: AdminUser['persona'];
    roles: string[];
    permissions: string[];
    token_weblogin?: string | null;
  };
}
