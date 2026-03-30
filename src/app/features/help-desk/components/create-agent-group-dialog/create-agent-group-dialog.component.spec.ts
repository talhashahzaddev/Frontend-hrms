import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateAgentGroupDialogComponent } from './create-agent-group-dialog.component';

describe('CreateAgentGroupDialogComponent', () => {
  let component: CreateAgentGroupDialogComponent;
  let fixture: ComponentFixture<CreateAgentGroupDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAgentGroupDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateAgentGroupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
