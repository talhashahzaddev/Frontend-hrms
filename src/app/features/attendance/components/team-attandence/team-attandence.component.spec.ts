import { provideTestDefaults } from 'src/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamAttandenceComponent } from './team-attandence.component';

describe('TeamAttandenceComponent', () => {
  let component: TeamAttandenceComponent;
  let fixture: ComponentFixture<TeamAttandenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamAttandenceComponent],
      providers: [...provideTestDefaults()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamAttandenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
