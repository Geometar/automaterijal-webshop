import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appSwipeClose]',
  standalone: true
})
export class SwipeCloseDirective {
  // Event for swipe right-to-left (close action)
  @Output() swipeLeft = new EventEmitter<void>();

  // Event for swipe left-to-right
  @Output() swipeRight = new EventEmitter<void>();

  // Event for swipe down
  @Output() swipeDown = new EventEmitter<void>();

  // Event for swipe up
  @Output() swipeUp = new EventEmitter<void>();

  // Coordinates for tracking swipe start and end
  private touchStartX: number = 0;
  private touchEndX: number = 0;
  private touchStartY: number = 0;
  private touchEndY: number = 0;

  // Save the starting touch coordinates (X and Y)
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  // Save the ending touch coordinates (X and Y) and determine swipe direction
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    this.handleSwipe();
  }

  // Determine swipe direction and emit the corresponding event
  private handleSwipe(): void {
    const swipeX = this.touchEndX - this.touchStartX;
    const swipeY = this.touchEndY - this.touchStartY;

    // Determine if the swipe is more horizontal or vertical
    if (Math.abs(swipeX) > Math.abs(swipeY)) {
      // Horizontal swipe
      if (swipeX < -80) {
        this.swipeLeft.emit(); // Right-to-left swipe
      } else if (swipeX > 80) {
        this.swipeRight.emit(); // Left-to-right swipe
      }
    } else {
      // Vertical swipe
      if (swipeY > 80) {
        this.swipeDown.emit(); // Top-to-bottom swipe
      } else if (swipeY < -80) {
        this.swipeUp.emit(); // Bottom-to-top swipe
      }
    }
  }
}