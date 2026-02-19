export interface AssetType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Asset {
  id: string;
  name: string;
  assetTag?: string;
  code?: string;
  assetTypeId: string;
  typeName?: string;
  purchaseDate?: string;
  status?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAssetTypeRequest {
  name: string;
  description?: string;
}

export interface UpdateAssetTypeRequest {
  id: string;
  name: string;
  description?: string;
}

export interface CreateAssetRequest {
  name: string;
  assetTag: string;
  code?: string;
  typeId: string;
  purchaseDate?: string;
  status?: string;
  notes?: string;
}

export interface UpdateAssetRequest {
  name?: string;
  assetTag?: string;
  code?: string;
  typeId?: string;
  purchaseDate?: string;
  status?: string;
  notes?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}