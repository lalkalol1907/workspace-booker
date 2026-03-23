import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { hostFromRequest } from '../common/utils/tenant-host';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Tenant is resolved from the Host header (or X-Forwarded-Host).',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse()
  login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
  ): Promise<TokenResponseDto> {
    return this.auth.login(dto, hostFromRequest(req));
  }

  @Post('platform/login')
  @ApiOperation({
    summary: 'Platform admin login',
    description:
      'Login for multitenant administrators (no tenant host required).',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse()
  platformLogin(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.auth.platformLogin(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Current user' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse()
  me(@CurrentUser() user: JwtPayload): Promise<MeResponseDto> {
    return this.auth.me(user);
  }

  @Post('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Change password (required when mustChangePassword is true)' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiUnauthorizedResponse()
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.auth.changePassword(user, dto);
  }
}
