import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTicketDialogueComponent } from './create-ticket-dialogue.component';

describe('CreateTicketDialogueComponent', () => {
  let component: CreateTicketDialogueComponent;
  let fixture: ComponentFixture<CreateTicketDialogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTicketDialogueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTicketDialogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
