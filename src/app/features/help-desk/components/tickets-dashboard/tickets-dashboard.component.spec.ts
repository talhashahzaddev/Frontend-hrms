import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketsDashboardComponent } from './tickets-dashboard.component';

describe('TicketsDashboardComponent', () => {
  let component: TicketsDashboardComponent;
  let fixture: ComponentFixture<TicketsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
