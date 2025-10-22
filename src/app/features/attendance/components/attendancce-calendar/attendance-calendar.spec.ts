import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceCalendarComponent } from './attendance-calendar';

describe('AttendanceCalendar', () => {
  let component: AttendanceCalendarComponent;
  let fixture: ComponentFixture<AttendanceCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceCalendarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
