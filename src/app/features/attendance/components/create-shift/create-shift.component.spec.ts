import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateShiftComponent } from './create-shift.component';

describe('CreateShiftComponent', () => {
  let component: CreateShiftComponent;
  let fixture: ComponentFixture<CreateShiftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateShiftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateShiftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
