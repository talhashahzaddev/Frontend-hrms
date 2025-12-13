import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewDepartmentDetailsComponent } from './view-department-details.component';

describe('ViewDepartmentDetailsComponent', () => {
  let component: ViewDepartmentDetailsComponent;
  let fixture: ComponentFixture<ViewDepartmentDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewDepartmentDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewDepartmentDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
