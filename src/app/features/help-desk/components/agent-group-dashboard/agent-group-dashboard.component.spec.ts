import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentGroupDashboardComponent } from './agent-group-dashboard.component';

describe('AgentGroupDashboardComponent', () => {
  let component: AgentGroupDashboardComponent;
  let fixture: ComponentFixture<AgentGroupDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentGroupDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentGroupDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
