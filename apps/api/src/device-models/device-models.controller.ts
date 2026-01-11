import { Controller, Get, Post, Put, Param, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceModelsService } from './device-models.service';
import { CreateDeviceModelDto, UpdateDeviceModelDto } from '@iot-platform/shared';

@Controller('api/device-models')
export class DeviceModelsController {
  constructor(private deviceModelsService: DeviceModelsService) {}

  @Get()
  async getAllModels() {
    return this.deviceModelsService.findAll();
  }

  @Get(':id')
  async getModel(@Param('id') id: string) {
    const model = await this.deviceModelsService.findOne(id);
    if (!model) {
      throw new NotFoundException(`Device model ${id} not found`);
    }
    return model;
  }

  @Post()
  async createModel(@Body() dto: CreateDeviceModelDto) {
    try {
      return await this.deviceModelsService.create(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put(':id')
  async updateModel(@Param('id') id: string, @Body() dto: UpdateDeviceModelDto) {
    try {
      return await this.deviceModelsService.update(id, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
