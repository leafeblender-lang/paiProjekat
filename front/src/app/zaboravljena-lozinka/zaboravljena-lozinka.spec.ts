import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZaboravljenaLozinka } from './zaboravljena-lozinka';

describe('ZaboravljenaLozinka', () => {
  let component: ZaboravljenaLozinka;
  let fixture: ComponentFixture<ZaboravljenaLozinka>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZaboravljenaLozinka]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZaboravljenaLozinka);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
