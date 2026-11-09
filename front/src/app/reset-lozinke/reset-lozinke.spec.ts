import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetLozinke } from './reset-lozinke';

describe('ResetLozinke', () => {
  let component: ResetLozinke;
  let fixture: ComponentFixture<ResetLozinke>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetLozinke]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResetLozinke);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
