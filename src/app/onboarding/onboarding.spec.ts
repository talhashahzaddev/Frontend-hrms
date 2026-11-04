import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Onboarding } from './onboarding.component';

describe('Onboarding', () => {
  let component: Onboarding;
  let fixture: ComponentFixture<Onboarding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Onboarding],
      providers: [...provideTestDefaults()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Onboarding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
