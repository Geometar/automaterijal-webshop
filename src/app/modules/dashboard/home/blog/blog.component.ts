import { Component, ViewEncapsulation } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { CommonModule } from '@angular/common';

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
    this.configService.getConfig().subscribe(config => {
      this.videos = config.youtubeLinks.filter(v => v.visible !== false);
    });
  }
}
