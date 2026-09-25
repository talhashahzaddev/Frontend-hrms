
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NewsService } from '../../services/news.services';
import { NewsDto } from '@/app/core/models/news.models';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

import { SharedCommonModule } from '@shared/shared-common.module';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-news-view',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatButtonModule,
    PageHeaderComponent
  ],
  templateUrl: './news-view.component.html',
  styleUrls: ['./news-view.component.scss'],
})
export class NewsViewComponent implements OnInit {
  news: NewsDto | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.newsService.getNewsById(id).subscribe({
        next: (news) => {
          this.news = news;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err?.message || 'Failed to load news.';
          this.isLoading = false;
        }
      });
    } else {
      this.error = 'No news ID provided.';
      this.isLoading = false;
    }
  }
  goBack():void{
    this.router.navigate(['/news/dashboard'])
  }
}
