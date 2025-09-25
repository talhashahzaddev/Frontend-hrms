import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalsKRAsComponent } from './goals-kras.component';

describe('GoalsKRAsComponent', () => {
  let component: GoalsKRAsComponent;
  let fixture: ComponentFixture<GoalsKRAsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalsKRAsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalsKRAsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
