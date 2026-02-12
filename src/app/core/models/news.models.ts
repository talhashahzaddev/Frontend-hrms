export interface NewsRequest {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  status: string;               // Draft / Published
  visibleTo: string;            // All / Selected / etc
  selectedEmployees?: string[]; // Guid[]
}
export interface NewsDto {
  newsId?: string;
  title: string;
  organizationId?: string;
  description: string;
  createdBy: string;
  category: string;
  imageUrl?: string;
  publishedAt?: Date | string;
  status: string;
  views?: number;
  visibleTo: string;
  selectedEmployees?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  isRead?: boolean;
}