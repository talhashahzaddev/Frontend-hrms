import { InjectionToken } from '@angular/core';

export interface ColorOption {
  name: string;
  value: string;
}

export const LEAVE_COLORS: ColorOption[] = [
  { name: 'Red', value: '#f44336' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Purple', value: '#9c27b0' },
  { name: 'Deep Purple', value: '#673ab7' },
  { name: 'Indigo', value: '#3f51b5' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Light Blue', value: '#03a9f4' },
  { name: 'Cyan', value: '#00bcd4' },
  { name: 'Teal', value: '#009688' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Light Green', value: '#8bc34a' },
  { name: 'Lime', value: '#cddc39' },
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Amber', value: '#ffc107' },
  { name: 'Orange', value: '#ff9800' },
  { name: 'Deep Orange', value: '#ff5722' }
];

export const LEAVE_COLOR_TOKEN = new InjectionToken<ColorOption[]>('LEAVE_COLOR_TOKEN', {
  providedIn: 'root',
  factory: () => LEAVE_COLORS
});
