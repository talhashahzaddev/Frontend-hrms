import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalsComponent } from './appraisals.component';

describe('AppraisalsComponent', () => {
  let component: AppraisalsComponent;
  let fixture: ComponentFixture<AppraisalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppraisalsComponent],
      providers: [...provideTestDefaults()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
