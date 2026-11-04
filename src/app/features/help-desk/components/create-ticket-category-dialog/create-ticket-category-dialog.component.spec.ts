import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTicketCategoryDialogComponent } from './create-ticket-category-dialog.component';

describe('CreateTicketCategoryDialogComponent', () => {
  let component: CreateTicketCategoryDialogComponent;
  let fixture: ComponentFixture<CreateTicketCategoryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTicketCategoryDialogComponent],
      providers: [...provideTestDefaults()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTicketCategoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
