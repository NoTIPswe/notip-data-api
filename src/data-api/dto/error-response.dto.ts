import { ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiPropertyOptional({
    description: 'HTTP status code when Nest maps the error directly',
    example: 400,
  })
  statusCode?: number;

  @ApiPropertyOptional({
    description: 'Application-level error code, when provided by the service',
    example: 'QUERY_LIMIT_EXCEEDED',
  })
  code?: string;

  @ApiPropertyOptional({
    description: 'Human-readable error message',
    example: 'limit must be less than or equal to 1000',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Short HTTP error label when returned by Nest',
    example: 'Bad Request',
  })
  error?: string;
}
