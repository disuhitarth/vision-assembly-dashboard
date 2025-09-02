import { IsString, IsArray, IsNotEmpty, IsAny } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReadTagDto {
  @ApiProperty({ description: 'Array of PLC tag names to read', example: ['Line.State', 'Part.Counter'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  tags: string[];
}

export class WriteTagDto {
  @ApiProperty({ description: 'PLC tag name to write', example: 'Line.RunCmd' })
  @IsString()
  @IsNotEmpty()
  tag: string;

  @ApiProperty({ description: 'Value to write to the tag', example: true })
  @IsAny()
  value: any;
}