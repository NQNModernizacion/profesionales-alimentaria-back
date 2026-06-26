import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.types';
import { Public } from './guards/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { type JwtPayload } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesion y obtener tokens JWT' })
  @ApiOkResponse({ description: 'Autenticacion exitosa' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Perfil del usuario autenticado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refrescar tokens de autenticacion' })
  @ApiOkResponse({ description: 'Tokens renovados correctamente' })
  refresh(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesion y revocar token actual' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Sesion cerrada correctamente' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user);
    return { ok: true };
  }
}
