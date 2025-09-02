import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PlcService } from './plc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReadTagDto, WriteTagDto } from './dto/plc.dto';

@ApiTags('PLC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/plc')
export class PlcController {
  constructor(private readonly plcService: PlcService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get PLC connection status' })
  @ApiResponse({ status: 200, description: 'PLC status retrieved successfully' })
  getStatus() {
    return {
      connected: true, // This would come from the PLC driver
      tags: this.plcService.getTagSnapshot(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('read/:tag')
  @ApiOperation({ summary: 'Read a single PLC tag' })
  @Roles('operator', 'supervisor', 'admin')
  async readTag(@Param('tag') tag: string) {
    try {
      const value = await this.plcService.readTag(tag);
      return {
        tag,
        value,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to read tag ${tag}: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('write')
  @ApiOperation({ summary: 'Write to a PLC tag' })
  @Roles('supervisor', 'admin')
  async writeTag(@Body() writeTagDto: WriteTagDto, @Request() req) {
    try {
      await this.plcService.writeTag(writeTagDto.tag, writeTagDto.value);
      
      // Log the write operation for audit
      console.log(`Tag write: ${writeTagDto.tag} = ${writeTagDto.value} by user ${req.user.username}`);
      
      return {
        success: true,
        tag: writeTagDto.tag,
        value: writeTagDto.value,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to write tag ${writeTagDto.tag}: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('batch-read')
  @ApiOperation({ summary: 'Read multiple PLC tags' })
  @Roles('operator', 'supervisor', 'admin')
  async batchRead(@Body() readTagsDto: ReadTagDto) {
    const results = {};
    const errors = {};

    for (const tag of readTagsDto.tags) {
      try {
        results[tag] = await this.plcService.readTag(tag);
      } catch (error) {
        errors[tag] = error.message;
      }
    }

    return {
      results,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Get current snapshot of all cached tags' })
  @Roles('operator', 'supervisor', 'admin')
  getTagSnapshot() {
    return {
      tags: this.plcService.getTagSnapshot(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('emergency-stop')
  @ApiOperation({ summary: 'Trigger emergency stop' })
  @Roles('operator', 'supervisor', 'admin')
  async emergencyStop(@Request() req) {
    try {
      await this.plcService.writeTag('Emergency.Stop', true);
      
      // Critical operation logging
      console.log(`EMERGENCY STOP triggered by user ${req.user.username} at ${new Date().toISOString()}`);
      
      return {
        success: true,
        message: 'Emergency stop triggered',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to trigger emergency stop: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset line after fault' })
  @Roles('supervisor', 'admin')
  async resetLine(@Request() req) {
    try {
      await this.plcService.writeTag('Line.Reset', true);
      
      // Reset flag after brief delay
      setTimeout(async () => {
        await this.plcService.writeTag('Line.Reset', false);
      }, 1000);
      
      console.log(`Line reset by user ${req.user.username} at ${new Date().toISOString()}`);
      
      return {
        success: true,
        message: 'Line reset initiated',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to reset line: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}