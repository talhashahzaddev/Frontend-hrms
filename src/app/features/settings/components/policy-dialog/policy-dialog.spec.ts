import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestDefaults } from 'src/testing/test-providers';
import { PolicyDialogComponent } from './policy-dialog.component';

describe('PolicyDialogComponent', () => {
  let fixture: ComponentFixture<PolicyDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyDialogComponent],
      providers: [...provideTestDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyDialogComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
