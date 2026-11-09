import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Registracija } from './registracija';

describe('Registracija', () => {
  let component: Registracija;
  let fixture: ComponentFixture<Registracija>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registracija]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Registracija);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
