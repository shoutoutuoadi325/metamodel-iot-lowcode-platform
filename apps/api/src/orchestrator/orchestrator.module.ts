import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { FlowsModule } from '../flows/flows.module';

@Module({
  imports: [FlowsModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
