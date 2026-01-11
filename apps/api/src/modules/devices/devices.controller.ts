import { Controller, Get, Post, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('api/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll() {
    return this.devicesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const device = await this.devicesService.findOne(id);
    if (!device) {
      throw new HttpException('Device not found', HttpStatus.NOT_FOUND);
    }
    return device;
  }

  @Post(':id/actions/:actionName')
  async executeAction(
    @Param('id') deviceId: string,
    @Param('actionName') actionName: string,
    @Body() params: Record<string, any>,
  ) {
    try {
      return await this.devicesService.executeAction(deviceId, actionName, params);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to execute action',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
