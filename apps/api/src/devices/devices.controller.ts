import { Controller, Get, Post, Param, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { ExecuteActionDto } from '@iot-platform/shared';

@Controller('api/devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Get()
  async getAllDevices() {
    return this.devicesService.findAll();
  }

  @Get(':id')
  async getDevice(@Param('id') id: string) {
    const device = await this.devicesService.findOne(id);
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  @Post(':id/actions/:actionName')
  async executeAction(
    @Param('id') id: string,
    @Param('actionName') actionName: string,
    @Body() dto: ExecuteActionDto,
  ) {
    try {
      const result = await this.devicesService.executeAction(id, actionName, dto.params);
      return { ok: true, result };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id/state/history')
  async getStateHistory(@Param('id') id: string) {
    return this.devicesService.getStateHistory(id);
  }

  @Get(':id/events/history')
  async getEventHistory(@Param('id') id: string) {
    return this.devicesService.getEventHistory(id);
  }
}
