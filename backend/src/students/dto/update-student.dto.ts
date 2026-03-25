import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsString()
  @IsOptional()
  course?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsEnum(['activo', 'inactivo', 'completado', 'abandonado'])
  @IsOptional()
  status?: string;
}
