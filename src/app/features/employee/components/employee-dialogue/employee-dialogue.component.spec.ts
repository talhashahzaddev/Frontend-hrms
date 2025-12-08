import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeDialogueComponent } from './employee-dialogue.component';

describe('EmployeeDialogueComponent', () => {
  let component: EmployeeDialogueComponent;
  let fixture: ComponentFixture<EmployeeDialogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDialogueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeDialogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
