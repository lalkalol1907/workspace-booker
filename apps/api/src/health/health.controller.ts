import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    },
  })
  check(): { ok: boolean } {
    return { ok: true };
  }
}
