import { Controller, Get, Post, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FlowsService } from './flows.service';

@Controller('api/flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  async findAll() {
    return this.flowsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const flow = await this.flowsService.findOne(id);
    if (!flow) {
      throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
    }
    return flow;
  }

  @Post()
  async create(@Body() data: any) {
    return this.flowsService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.flowsService.update(id, data);
  }

  @Post(':id/enable')
  async enable(@Param('id') id: string) {
    return this.flowsService.enable(id);
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string) {
    return this.flowsService.disable(id);
  }

  @Get(':id/runs')
  async getRuns(@Param('id') id: string) {
    return this.flowsService.getRuns(id);
  }
}
