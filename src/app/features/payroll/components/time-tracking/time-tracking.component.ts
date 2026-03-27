// Force recompile
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-time-tracking',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './time-tracking.component.html',
  styleUrl: './time-tracking.component.scss'
})
export class TimeTrackingComponent {
  records = [
    { name: 'Ali Hassan', initials: 'AH', color: 'blue', date: 'Mar 12, 2025', hours: 3.5, rate: '1,200', amount: '4,200', type: 'Regular', typeClass: 'type-regular' },
    { name: 'Sara Ahmed', initials: 'SA', color: 'pink', date: 'Mar 13, 2025', hours: 4.0, rate: '1,500', amount: '6,000', type: 'Holiday', typeClass: 'type-holiday' },
    { name: 'Usman Khan', initials: 'UK', color: 'amber', date: 'Mar 14, 2025', hours: 2.0, rate: '1,100', amount: '2,200', type: 'Regular', typeClass: 'type-regular' },
    { name: 'Fatima Malik', initials: 'FM', color: 'emerald', date: 'Mar 15, 2025', hours: 5.5, rate: '2,000', amount: '11,000', type: 'Weekend', typeClass: 'type-weekend' },
    { name: 'Bilal Raza', initials: 'BR', color: 'indigo', date: 'Mar 16, 2025', hours: 3.0, rate: '1,200', amount: '3,600', type: 'Regular', typeClass: 'type-regular' },
    { name: 'Nadia Qureshi', initials: 'NQ', color: 'purple', date: 'Mar 17, 2025', hours: 2.5, rate: '1,400', amount: '3,500', type: 'Regular', typeClass: 'type-regular' }
  ];
}
