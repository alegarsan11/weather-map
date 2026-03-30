import { TestBed } from '@angular/core/testing';

import { Geoserver } from './geoserver';

describe('Geoserver', () => {
  let service: Geoserver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Geoserver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
