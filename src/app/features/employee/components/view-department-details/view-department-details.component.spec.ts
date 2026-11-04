import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewDepartmentDetailsComponent } from './view-department-details.component';

describe('ViewDepartmentDetailsComponent', () => {
  let component: ViewDepartmentDetailsComponent;
  let fixture: ComponentFixture<ViewDepartmentDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewDepartmentDetailsComponent],
      providers: [...provideTestDefaults({ department: { departmentId: 'd-1', departmentName: 'IT', isActive: true }, managers: [] })]
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
