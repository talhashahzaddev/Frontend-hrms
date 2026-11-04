import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvlovementTicketViewComponent } from './invlovement-ticket-view.component';

describe('InvlovementTicketViewComponent', () => {
  let component: InvlovementTicketViewComponent;
  let fixture: ComponentFixture<InvlovementTicketViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvlovementTicketViewComponent],
      providers: [...provideTestDefaults()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvlovementTicketViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
