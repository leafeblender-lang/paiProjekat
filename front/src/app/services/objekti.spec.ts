import { TestBed } from '@angular/core/testing';

import { Objekti } from './objekti';

describe('Objekti', () => {
  let service: Objekti;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Objekti);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
