import { EncryptedEnvelopeDto } from './encrypted-envelope.dto';

export class QueryResponseDto {
  data?: EncryptedEnvelopeDto[];
  nextCursor?: string;
  hasMore: boolean;
}