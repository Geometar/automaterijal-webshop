import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs';

// Data models
import { BlogPreview } from '../../../../shared/data-models/model';

// Service
import { ConfigService } from '../../../../shared/service/config.service';
import { YoutubeLink } from '../../../../shared/data-models/interface';
import { BlogService } from '../../../../shared/service/blog.service';

type BlogTeaser = Pick<BlogPreview, 'slug' | 'title' | 'excerpt' | 'publishedAt'> & {
  excerpt: string;
};

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [YouTubePlayer, CommonModule, RouterModule],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BlogComponent implements OnInit {
  videos: YoutubeLink[] = [];
  latestPosts: BlogTeaser[] = [];

  constructor(
    private configService: ConfigService,
    private blogService: BlogService
  ) {
    this.configService.getConfig().pipe(take(1)).subscribe(config => {
      this.videos = config.youtubeLinks.filter(v => v.visible !== false);
    });
  }

  ngOnInit(): void {
    this.loadLatestPosts();
  }

  private loadLatestPosts(): void {
    this.blogService
      .getPosts({ page: 0, size: 3, status: 'PUBLISHED', sort: 'publishedAt,desc' })
      .pipe(take(1))
      .subscribe({
        next: response => (this.latestPosts = (response.items ?? []).map(item => this.toTeaser(item))),
        error: error => console.error('Neuspešno učitavanje blog postova', error)
      });
  }

  private toTeaser(item: BlogPreview): BlogTeaser {
    const cleanExcerpt = (item.excerpt ?? '').replace(/\s+/g, ' ').trim();
    const preview = cleanExcerpt.length > 120 ? `${cleanExcerpt.slice(0, 117).trimEnd()}…` : cleanExcerpt;

    return {
      slug: item.slug,
      title: item.title,
      publishedAt: item.publishedAt,
      excerpt: preview
    };
  }
}
