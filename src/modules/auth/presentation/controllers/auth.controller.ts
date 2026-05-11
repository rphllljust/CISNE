import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ForgotPasswordDto } from '../../application/dto/forgot-password.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { LogoutDto } from '../../application/dto/logout.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { ResetPasswordDto } from '../../application/dto/reset-password.dto';
import { AuthService } from '../../application/services/auth.service';
import type { JwtUserPayload } from '../../domain/interfaces/jwt-user-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica usuario com e-mail e senha' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() request: Request
  ): Promise<unknown> {
    return this.authService.login(dto, {
      ip,
      userAgent: request.headers['user-agent']
    });
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 12 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o access token com refresh token rotativo' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Req() request: Request
  ): Promise<unknown> {
    return this.authService.refresh(dto, {
      ip,
      userAgent: request.headers['user-agent']
    });
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicita reset de senha' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefine senha com token de reset' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra sessao e revoga refresh token(s)' })
  async logout(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: LogoutDto
  ): Promise<{ message: string }> {
    return this.authService.logout(user.sub, dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Retorna dados do usuario autenticado' })
  me(@CurrentUser() user: JwtUserPayload): JwtUserPayload {
    return user;
  }
}
