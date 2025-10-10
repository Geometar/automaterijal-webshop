import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Params, RouterModule } from '@angular/router';

type MetaPillVariant = 'neutral' | 'primary' | 'accent' | 'soft' | 'ghost';
type MetaPillSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'autom-meta-pill',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './meta-pill.component.html',
  styleUrls: ['./meta-pill.component.scss']
})
export class MetaPillComponent {
  @Input() label?: string | null;
  @Input() value?: string | null;
  @Input() prefix?: string | null;
  @Input() suffix?: string | null;
  @Input() variant: MetaPillVariant = 'neutral';
  @Input() size: MetaPillSize = 'md';
  @Input() routerLink?: string | any[] | null;
  @Input() queryParams?: Params | null;
  @Input() href?: string | null;
  @Input() target?: string | null;
  @Input() rel?: string | null;
  @Input() ariaLabel?: string | null;
  @Input() download?: string | null;
  @Input() disabled = false;

  get linkType(): 'router' | 'href' | 'none' {
    if (this.disabled) return 'none';
    if (this.routerLink) {
      return 'router';
    }
    if (this.href) {
      return 'href';
    }
    return 'none';
  }

  get isLink(): boolean {
    return this.linkType !== 'none';
  }

  get hostClasses(): Record<string, boolean> {
    return {
      'meta-pill': true,
      [`meta-pill--${this.size}`]: true,
      [`meta-pill--${this.variant}`]: true,
      'meta-pill--clickable': this.isLink,
      'meta-pill--disabled': this.disabled
    };
  }
}
