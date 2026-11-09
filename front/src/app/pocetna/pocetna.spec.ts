import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pocetna } from './pocetna';

describe('Pocetna', () => {
  let component: Pocetna;
  let fixture: ComponentFixture<Pocetna>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pocetna]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pocetna);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
