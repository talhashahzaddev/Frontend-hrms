import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketInvolvementComponent } from './ticket-involvement.component';

describe('TicketInvolvementComponent', () => {
  let component: TicketInvolvementComponent;
  let fixture: ComponentFixture<TicketInvolvementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketInvolvementComponent],
      providers: [...provideTestDefaults()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketInvolvementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
