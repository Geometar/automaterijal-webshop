import { Component, ViewEncapsulation } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [YouTubePlayer],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent {

}
