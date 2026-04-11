import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token enviado por e-mail no formato id.segredo' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NovaSenha@123' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'A senha deve conter letra maiuscula, minuscula e numero'
  })
  newPassword!: string;
}
