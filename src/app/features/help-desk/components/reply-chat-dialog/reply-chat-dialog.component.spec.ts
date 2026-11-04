import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReplyChatDialogComponent } from './reply-chat-dialog.component';

describe('ReplyChatDialogComponent', () => {
  let component: ReplyChatDialogComponent;
  let fixture: ComponentFixture<ReplyChatDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReplyChatDialogComponent],
      providers: [...provideTestDefaults({ ticket: { ticketid: 't-1', ticketTitle: 'Laptop', assignedEmployees: [] }, senderId: 'u-1', senderEmail: 'a@test.com' })]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReplyChatDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
