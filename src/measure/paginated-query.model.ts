import { EncryptedEnvelopeModel } from './encrypted-envelope.model';

export class PaginatedQueryModel {
  data: EncryptedEnvelopeModel[];
  nextCursor?: string;
  hasMore: boolean;
}