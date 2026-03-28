import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly text = signal<string | null>(null);
  readonly kind = signal<ToastKind>('info');

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, kind: ToastKind = 'info'): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.text.set(message);
    this.kind.set(kind);
    this.timer = setTimeout(() => this.clear(), 4500);
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.text.set(null);
  }
}
