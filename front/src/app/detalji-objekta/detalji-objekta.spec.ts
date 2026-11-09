import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetaljiObjekta } from './detalji-objekta';

describe('DetaljiObjekta', () => {
  let component: DetaljiObjekta;
  let fixture: ComponentFixture<DetaljiObjekta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetaljiObjekta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetaljiObjekta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
