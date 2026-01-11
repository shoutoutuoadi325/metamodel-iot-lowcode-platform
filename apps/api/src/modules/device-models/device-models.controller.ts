import { Controller, Get, Post, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DeviceModelsService } from './device-models.service';

@Controller('api/device-models')
export class DeviceModelsController {
  constructor(private readonly deviceModelsService: DeviceModelsService) {}

  @Get()
  async findAll() {
    return this.deviceModelsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const model = await this.deviceModelsService.findOne(id);
    if (!model) {
      throw new HttpException('Device model not found', HttpStatus.NOT_FOUND);
    }
    return model;
  }

  @Post()
  async create(@Body() data: any) {
    try {
      return await this.deviceModelsService.create(data);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create device model',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    try {
      return await this.deviceModelsService.update(id, data);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update device model',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
