import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsDashbaordComponent } from './news-dashbaord.component';

describe('NewsDashbaordComponent', () => {
  let component: NewsDashbaordComponent;
  let fixture: ComponentFixture<NewsDashbaordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsDashbaordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsDashbaordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
