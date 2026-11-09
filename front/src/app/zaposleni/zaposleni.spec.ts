import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Zaposleni } from './zaposleni';

describe('Zaposleni', () => {
  let component: Zaposleni;
  let fixture: ComponentFixture<Zaposleni>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Zaposleni]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Zaposleni);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
