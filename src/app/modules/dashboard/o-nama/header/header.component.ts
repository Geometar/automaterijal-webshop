import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'onama-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @ViewChild('presentationVideo') videoElement!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    const video = this.videoElement.nativeElement;

    // Ensure the video is muted
    video.muted = true;

    // Listen for volume change and reapply muted
    video.addEventListener('volumechange', () => {
      if (!video.muted) {
        video.muted = true;
      }
    });
  }
}
