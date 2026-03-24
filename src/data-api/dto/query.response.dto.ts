import { ApiProperty } from '@nestjs/swagger';
import { EncryptedEnvelopeDto } from './encrypted-envelope.dto';

export class QueryResponseDto {
  @ApiProperty({ type: [EncryptedEnvelopeDto] })
  data?: EncryptedEnvelopeDto[];
  @ApiProperty({ name: 'next_cursor' })
  nextCursor?: string;
  @ApiProperty({ name: 'has_more' })
  hasMore: boolean;
}
