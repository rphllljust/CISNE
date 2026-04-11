import { randomBytes } from 'crypto';

import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import type { StringValue } from 'ms';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../domain/interfaces/jwt-user-payload.interface';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

interface AccessContext {
  ip: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async login(dto: LoginDto, context: AccessContext): Promise<{
    user: Omit<JwtUserPayload, 'permissions'>;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || user.deletedAt) {
      await this.registerLoginHistory({
        email: dto.email,
        success: false,
        failureReason: 'Invalid credentials',
        ip: context.ip,
        userAgent: context.userAgent
      });
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const validPassword = await compare(dto.password, user.passwordHash);
    if (!validPassword || user.status !== 'ACTIVE') {
      await this.registerLoginHistory({
        userId: user.id,
        email: dto.email,
        success: false,
        failureReason: 'Invalid credentials or inactive user',
        ip: context.ip,
        userAgent: context.userAgent
      });
      throw new UnauthorizedException('Credenciais invalidas ou usuario inativo');
    }

    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code)
        )
      )
    ];

    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles,
      permissions
    };

    const tokenPair = await this.issueTokenPair(payload, context);

    await this.registerLoginHistory({
      userId: user.id,
      email: dto.email,
      success: true,
      ip: context.ip,
      userAgent: context.userAgent
    });

    await this.auditService.register({
      actorId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'auth',
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        email: user.email
      }
    });

    return {
      user: {
        sub: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        status: payload.status,
        roles: payload.roles
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken
    };
  }

  async refresh(dto: RefreshTokenDto, context: AccessContext): Promise<TokenPair> {
    let decoded: { sub: string };
    try {
      decoded = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'change_this_refresh_secret'
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: decoded.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    const matchedToken = await this.findMatchingRefreshToken(dto.refreshToken, activeTokens);
    if (!matchedToken) {
      throw new UnauthorizedException('Refresh token nao reconhecido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('Usuario invalido para renovacao');
    }

    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: user.userRoles.map((item) => item.role.name),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((item) => item.role.rolePermissions.map((rp) => rp.permission.code))
        )
      ]
    };

    const tokenPair = await this.issueTokenPair(payload, context);

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: {
        revokedAt: new Date()
      }
    });

    await this.auditService.register({
      actorId: user.id,
      action: 'AUTH_REFRESH_TOKEN',
      resource: 'auth',
      ip: context.ip,
      userAgent: context.userAgent
    });

    return tokenPair;
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true }
    });

    if (!user) {
      return {
        message: 'Se o e-mail existir, enviaremos instrucoes de recuperacao.'
      };
    }

    const secret = randomBytes(32).toString('hex');
    const tokenHash = await hash(secret, 10);
    const expiresAt = new Date(
      Date.now() + Number(this.configService.get('PASSWORD_RESET_EXPIRES_MINUTES', 30)) * 60 * 1000
    );

    const tokenRecord = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    await this.auditService.register({
      actorId: user.id,
      action: 'AUTH_FORGOT_PASSWORD_REQUESTED',
      resource: 'auth',
      metadata: {
        email: user.email
      }
    });

    const resetToken = `${tokenRecord.id}.${secret}`;

    return {
      message:
        this.configService.get('NODE_ENV') === 'production'
          ? 'Instrucoes de recuperacao enviadas.'
          : `Token de desenvolvimento: ${resetToken}`
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const [id, secret] = dto.token.split('.');
    if (!id || !secret) {
      throw new BadRequestException('Token de reset invalido');
    }

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado ou invalido');
    }

    const valid = await compare(secret, tokenRecord.tokenHash);
    if (!valid) {
      throw new BadRequestException('Token de reset invalido');
    }

    const passwordHash = await hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() }
      })
    ]);

    await this.auditService.register({
      actorId: tokenRecord.userId,
      action: 'AUTH_PASSWORD_RESET',
      resource: 'auth'
    });

    return { message: 'Senha redefinida com sucesso' };
  }

  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      const activeTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        }
      });
      const matchedToken = await this.findMatchingRefreshToken(refreshToken, activeTokens);

      if (matchedToken) {
        await this.prisma.refreshToken.update({
          where: { id: matchedToken.id },
          data: { revokedAt: new Date() }
        });
      }
    } else {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    await this.auditService.register({
      actorId: userId,
      action: 'AUTH_LOGOUT',
      resource: 'auth'
    });

    return { message: 'Sessao encerrada com sucesso' };
  }

  private async issueTokenPair(payload: JwtUserPayload, context: AccessContext): Promise<TokenPair> {
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'change_this_access_secret';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'change_this_refresh_secret';
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as StringValue
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: payload.sub, email: payload.email },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as StringValue
      }
    );

    const refreshTokenHash = await hash(refreshToken, 10);
    const refreshExpiresAt = new Date(Date.now() + this.parseDurationToMs(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt,
        ip: context.ip,
        userAgent: context.userAgent
      }
    });

    return {
      accessToken,
      refreshToken
    };
  }

  private async findMatchingRefreshToken(
    rawToken: string,
    activeTokens: Array<{ id: string; tokenHash: string }>
  ): Promise<{ id: string; tokenHash: string } | undefined> {
    for (const token of activeTokens) {
      const valid = await compare(rawToken, token.tokenHash);
      if (valid) {
        return token;
      }
    }

    return undefined;
  }

  private parseDurationToMs(duration: string): number {
    const regex = /^(\d+)([smhd])$/;
    const match = duration.match(regex);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    return value * 24 * 60 * 60 * 1000;
  }

  private async registerLoginHistory(input: {
    userId?: string;
    email: string;
    ip?: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
  }): Promise<void> {
    await this.prisma.loginHistory.create({
      data: {
        userId: input.userId,
        email: input.email,
        ip: input.ip,
        userAgent: input.userAgent,
        success: input.success,
        failureReason: input.failureReason
      }
    });
  }
}
