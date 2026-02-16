import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDetailsDialogueComponent } from './view-details-dialogue.component';

describe('CalendarDetailsDialogueComponent', () => {
  let component: CalendarDetailsDialogueComponent;
  let fixture: ComponentFixture<CalendarDetailsDialogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDetailsDialogueComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CalendarDetailsDialogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
