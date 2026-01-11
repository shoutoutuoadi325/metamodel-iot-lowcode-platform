import { Controller, Get, Post, Put, Delete, Param, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { CreateFlowDto, UpdateFlowDto } from '@iot-platform/shared';

@Controller('api/flows')
export class FlowsController {
  constructor(private flowsService: FlowsService) {}

  @Get()
  async getAllFlows() {
    return this.flowsService.findAll();
  }

  @Get(':id')
  async getFlow(@Param('id') id: string) {
    const flow = await this.flowsService.findOne(id);
    if (!flow) {
      throw new NotFoundException(`Flow ${id} not found`);
    }
    return flow;
  }

  @Post()
  async createFlow(@Body() dto: CreateFlowDto) {
    try {
      return await this.flowsService.create(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put(':id')
  async updateFlow(@Param('id') id: string, @Body() dto: UpdateFlowDto) {
    try {
      return await this.flowsService.update(id, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/enable')
  async enableFlow(@Param('id') id: string) {
    return this.flowsService.setEnabled(id, true);
  }

  @Post(':id/disable')
  async disableFlow(@Param('id') id: string) {
    return this.flowsService.setEnabled(id, false);
  }

  @Get(':id/runs')
  async getFlowRuns(@Param('id') id: string) {
    return this.flowsService.getFlowRuns(id);
  }

  @Delete(':id')
  async deleteFlow(@Param('id') id: string) {
    try {
      return await this.flowsService.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
}
