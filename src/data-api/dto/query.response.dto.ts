import { ApiProperty } from '@nestjs/swagger';
import { EncryptedEnvelopeDto } from './encrypted-envelope.dto';

export class QueryResponseDto {
  @ApiProperty({
    description: 'Page of encrypted measures',
    type: [EncryptedEnvelopeDto],
  })
  data?: EncryptedEnvelopeDto[];
  @ApiProperty({
    description: 'Cursor to request the next page, if available',
    example: '2026-03-23T09:58:00.000Z',
    required: false,
  })
  nextCursor?: string;
  @ApiProperty({
    description: 'Whether more pages are available',
    example: true,
  })
  hasMore: boolean;
}
