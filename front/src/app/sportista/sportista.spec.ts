import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sportista } from './sportista';

describe('Sportista', () => {
  let component: Sportista;
  let fixture: ComponentFixture<Sportista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sportista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sportista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
