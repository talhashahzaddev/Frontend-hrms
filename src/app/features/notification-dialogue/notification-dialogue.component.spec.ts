import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationDialogueComponent } from './notification-dialogue.component';

describe('NotificationDialogueComponent', () => {
  let component: NotificationDialogueComponent;
  let fixture: ComponentFixture<NotificationDialogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationDialogueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationDialogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
