import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { NewsDto } from '@/app/core/models/news.models';

@Component({
  selector: 'app-news-view-dialoguebox',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `

  <div class="news-dialog-container">

    <!-- Header -->
    <div class="news-dialog-header">
      <div class="header-title-group">
        <span class="dialog-title">{{ data.news.title }}</span>
        <span class="dialog-author">Author :{{ data.news.authorName || 'Unknown' }}</span>
      </div>
      <button mat-icon-button mat-dialog-close class="close-btn">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- News Details -->
    <div class="news-details-section">
      <div class="news-meta">
        <div class="meta-item">
          <span class="meta-label">Category</span>
          <mat-chip class="news-category-chip">
            {{ data.news.category }}
          </mat-chip>
        </div>

        <div class="meta-item">
          <span class="meta-label">Status</span>
          <mat-chip class="news-status-chip"
                    [ngClass]="{
                      'published': data.news.status === 'Published',
                      'draft': data.news.status !== 'Published'
                    }">
            {{ data.news.status }}
          </mat-chip>
        </div>

        <div class="meta-item date">
          <span class="meta-label">Published</span>
          <span class="meta-value">
            {{ data.news.publishedAt ? (data.news.publishedAt | date:'mediumDate') : 'Not published' }}
          </span>
        </div>
      </div>
    </div>

  <!-- Image -->
  <div class="news-image-section" *ngIf="data.news.imageUrl">
    <img
      [src]="data.news.imageUrl"
      [alt]="data.news.title"
      class="news-image"
    />
  </div>

  <!-- Description -->
  <div class="news-description-section">
    <h3>Description</h3>
    <p class="news-description">
      {{ data.news.description }}
    </p>
  </div>

  <!-- Actions -->
  <div class="news-dialog-actions">
    <button mat-flat-button color="primary" mat-dialog-close>
      Close
    </button>
  </div>

</div>


  `,

  styles: [`

  .news-dialog-container {
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    background: #fff;
    border-radius: 16px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
  }

  ::ng-deep .mat-mdc-dialog-container {
    border-radius: 16px !important;
    padding: 0 !important;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    max-width: 700px !important;
    width: 90vw !important;
    background: transparent !important;
  }

/* Header */


.news-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}


.header-title-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  max-width: calc(100% - 48px);
}


.dialog-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.dialog-author {
  font-size: 0.85rem;
  color: #e0e7ff;
  font-weight: 400;
  margin-top: 2px;
  opacity: 0.95;
  letter-spacing: 0.1px;
}


.close-btn {
  color: #fff;
  transition: all 0.2s ease;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

/* Details */

.news-details-section {
  padding: 28px 28px 0 28px;
}

.news-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #4b5563;
}

.meta-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
}

/* Chips */
.news-category-chip {
  background: #e0f2fe;
  color: #075985;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.news-status-chip {
  font-weight: 700;
  letter-spacing: 0.3px;
}

.news-status-chip.published {
  background: #fee2e2;
  color: #b91c1c;
}

.news-status-chip.draft {
  background: #e5e7eb;
  color: #374151;
}

/* --- IMAGE CHANGES START HERE --- */

.news-image-section {
  padding: 0 28px 20px 28px;
  display: flex;
  justify-content: center;
  background: #fff;
}

.news-image {
  /* This allows the image to be its natural size but never wider than the container */
  max-width: 100%; 
  height: auto;
  
  /* CRITICAL: contain prevents the "blurry zoom" effect of cover */
  object-fit: contain; 
  
  /* Forces the browser to render sharp edges (great for screenshots) */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;

  /* Sets a professional limit so huge images don't require infinite scrolling */
  max-height: 70vh; 
  
  border-radius: 8px;
  background: #f8fafc; /* light background for transparent/small images */
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
/* --- IMAGE CHANGES END HERE --- */

/* Description */

.news-description-section {
  padding: 0 28px 28px 28px;
}

.news-description-section h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: #111827;
}

.news-description {
  font-size: 0.95rem;
  line-height: 1.75;
  color: #374151;
  white-space: pre-wrap;
}

/* Actions */

.news-dialog-actions {
  padding: 20px 28px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Mobile */
@media (max-width: 768px) {
  .news-details-section,
  .news-image-section,
  .news-description-section,
  .news-dialog-actions {
    padding: 14px;
  }
  .dialog-title {
    font-size: 1rem;
  }
  .news-image {
    max-height: 50vh;
  }
  .news-dialog-actions {
    flex-direction: column;
    gap: 12px;
  }
}

`]

})
export class NewsViewDialogueboxComponent {
  constructor(
    public dialogRef: MatDialogRef<NewsViewDialogueboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { news: NewsDto }
  ) { }
}
