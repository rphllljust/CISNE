import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { CreateUserDto } from '../../application/dto/create-user.dto';
import { ListUsersQueryDto } from '../../application/dto/list-users-query.dto';
import { UpdateUserDto } from '../../application/dto/update-user.dto';
import { UsersService } from '../../application/services/users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cria novo usuario' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.usersService.create(dto, actor);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Lista usuarios com filtros e paginacao' })
  async findAll(@Query() query: ListUsersQueryDto): Promise<unknown> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Busca usuario por id' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Atualiza usuario' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Exclusao logica de usuario' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<{ message: string }> {
    await this.usersService.remove(id, actor);
    return { message: 'Usuario removido com sucesso' };
  }
}
