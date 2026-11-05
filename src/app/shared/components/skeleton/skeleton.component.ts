import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Loading placeholder that matches the shape of the content it stands in for.
 *   <app-skeleton variant="table" [rows]="6" [columns]="5" />
 *   <app-skeleton variant="cards" [rows]="4" />
 *   <app-skeleton variant="lines" [rows]="3" />
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk" [class]="'sk sk--' + variant" role="status" aria-live="polite" [attr.aria-label]="label">
      @switch (variant) {
        @case ('table') {
          <div class="sk-row sk-row--head">
            @for (c of cols; track $index) { <span class="hr-skeleton sk-cell sk-cell--head"></span> }
          </div>
          @for (r of items; track $index) {
            <div class="sk-row">
              @for (c of cols; track $index; let first = $first) {
                <span class="hr-skeleton sk-cell" [class.sk-cell--lead]="first"></span>
              }
            </div>
          }
        }
        @case ('cards') {
          @for (r of items; track $index) {
            <div class="sk-card">
              <span class="hr-skeleton sk-icon"></span>
              <span class="hr-skeleton sk-line sk-line--short"></span>
              <span class="hr-skeleton sk-line sk-line--value"></span>
              <span class="hr-skeleton sk-line"></span>
            </div>
          }
        }
        @default {
          @for (r of items; track $index; let last = $last) {
            <span class="hr-skeleton sk-line" [class.sk-line--short]="last"></span>
          }
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sk--lines { display: flex; flex-direction: column; gap: 10px; }
    .sk--table { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
    .sk-row { display: flex; gap: 16px; align-items: center; padding: 14px 16px; border-top: 1px solid #f1f5f9; }
    .sk-row--head { background: #f8fafc; border-top: 0; padding: 12px 16px; }
    .sk-cell { flex: 1; height: 12px; }
    .sk-cell--head { height: 10px; max-width: 90px; }
    .sk-cell--lead { flex: 1.6; height: 14px; }
    .sk--cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 16px; }
    .sk-card { display: flex; flex-direction: column; gap: 10px; padding: 18px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
    .sk-icon { width: 36px; height: 36px; border-radius: 10px; }
    .sk-line { height: 12px; width: 100%; }
    .sk-line--short { width: 55%; }
    .sk-line--value { height: 26px; width: 40%; }
  `]
})
export class SkeletonComponent {
  @Input() variant: 'table' | 'cards' | 'lines' = 'lines';
  @Input() label = 'Loading';

  items: number[] = [1, 2, 3];
  cols: number[] = [1, 2, 3, 4];

  @Input() set rows(n: number) { this.items = Array.from({ length: Math.max(1, n || 1) }, (_, i) => i); }
  @Input() set columns(n: number) { this.cols = Array.from({ length: Math.max(1, n || 1) }, (_, i) => i); }
}
