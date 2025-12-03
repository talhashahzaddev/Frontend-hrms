import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewDetailsDialogueComponent } from './view-details-dialogue.component';

describe('ViewDetailsDialogueComponent', () => {
  let component: ViewDetailsDialogueComponent;
  let fixture: ComponentFixture<ViewDetailsDialogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewDetailsDialogueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewDetailsDialogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
