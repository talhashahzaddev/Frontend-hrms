import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketCategoryComponent } from './ticket-category.component';

describe('TicketCategoryComponent', () => {
  let component: TicketCategoryComponent;
  let fixture: ComponentFixture<TicketCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketCategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
