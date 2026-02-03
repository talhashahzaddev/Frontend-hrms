import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];

export interface CloudinaryUploadResponse {
  secure_url: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class CloudinaryUploadService {
  private readonly cloudName = environment.cloudinary?.cloudName ?? '';
  private readonly uploadPreset = environment.cloudinary?.uploadPreset ?? '';

  constructor(private http: HttpClient) {}

  /**
   * Validates file type and size. Allowed: PDF, JPG, JPEG, PNG, GIF. Max 5 MB.
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file || !file.name) {
      return { valid: false, error: 'No file selected' };
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'Allowed formats: PDF, JPG, JPEG, PNG, GIF' };
    }
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== 'image/jpg') {
      return { valid: false, error: 'Invalid file type' };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { valid: false, error: 'File size must be 5 MB or less' };
    }
    return { valid: true };
  }

  /**
   * Uploads file to Cloudinary (unsigned). Returns the secure URL to store.
   * Configure environment.cloudinary.cloudName and uploadPreset for this to work.
   */
  uploadReceipt(file: File): Observable<string> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return throwError(() => new Error(validation.error));
    }

    if (!this.cloudName || !this.uploadPreset) {
      return throwError(
        () => new Error('Cloudinary is not configured. Add cloudName and uploadPreset to environment.')
      );
    }

    const resourceType = file.type === 'application/pdf' ? 'raw' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return this.http.post<CloudinaryUploadResponse>(url, formData).pipe(
      map((res) => res.secure_url),
      catchError((err) => {
        const msg =
          err?.error?.error?.message ||
          err?.message ||
          'Upload failed';
        return throwError(() => new Error(msg));
      })
    );
  }
}
