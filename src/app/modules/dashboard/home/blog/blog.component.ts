import { Component, ViewEncapsulation } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';

// Data models

// Service
import { ConfigService } from '../../../../shared/service/config.service';
import { YoutubeLink } from '../../../../shared/data-models/interface';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [YouTubePlayer, CommonModule],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BlogComponent {
  videos: YoutubeLink[] = [];

  constructor(private configService: ConfigService) {
    this.configService.getConfig().pipe(take(1)).subscribe(config => {
      this.videos = config.youtubeLinks.filter(v => v.visible !== false);
    });
  }
}
