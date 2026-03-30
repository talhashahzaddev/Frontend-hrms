import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvloveEmployeeDialogComponent } from './invlove-employee-dialog.component';

describe('InvloveEmployeeDialogComponent', () => {
  let component: InvloveEmployeeDialogComponent;
  let fixture: ComponentFixture<InvloveEmployeeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvloveEmployeeDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvloveEmployeeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
