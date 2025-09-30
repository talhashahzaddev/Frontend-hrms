import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalCycleFormComponent } from './appraisal-cycle-form.component';

describe('AppraisalCycleFormComponent', () => {
  let component: AppraisalCycleFormComponent;
  let fixture: ComponentFixture<AppraisalCycleFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppraisalCycleFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalCycleFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
