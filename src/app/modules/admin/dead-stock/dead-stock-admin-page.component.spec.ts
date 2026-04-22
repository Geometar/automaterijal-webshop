import { of, Subject, throwError } from 'rxjs';

import { DeadStockAdminPageComponent } from './dead-stock-admin-page.component';
import { Filter } from '../../../shared/data-models/model/roba';

describe('DeadStockAdminPageComponent', () => {
  let queryParams$: Subject<Record<string, unknown>>;
  let logicService: { createFilterFromParams: jasmine.Spy };
  let robaService: { pronadjiSvuRobu: jasmine.Spy };
  let snackbarService: { showError: jasmine.Spy };
  let urlHelperService: { addOrUpdateQueryParams: jasmine.Spy };

  function createComponent(): DeadStockAdminPageComponent {
    return new DeadStockAdminPageComponent(
      { queryParams: queryParams$ } as any,
      logicService as any,
      robaService as any,
      snackbarService as any,
      urlHelperService as any
    );
  }

  beforeEach(() => {
    queryParams$ = new Subject<Record<string, unknown>>();
    logicService = {
      createFilterFromParams: jasmine.createSpy('createFilterFromParams').and.returnValue({
        proizvodjaci: ['FEBI'],
        podgrupe: ['Hidraulika'],
        filterBy: 'SEARCH_TERM',
      }),
    };
    robaService = {
      pronadjiSvuRobu: jasmine.createSpy('pronadjiSvuRobu').and.returnValue(
        of({
          robaDto: {
            content: [{ robaid: 1, naziv: 'Test' }],
            totalElements: 1,
          },
        })
      ),
    };
    snackbarService = {
      showError: jasmine.createSpy('showError'),
    };
    urlHelperService = {
      addOrUpdateQueryParams: jasmine.createSpy('addOrUpdateQueryParams'),
    };
  });

  it('loads admin browse as a fixed dead-stock listing while reusing regular filters', () => {
    const component = createComponent();

    component.ngOnInit();
    queryParams$.next({
      searchTerm: 'filter ulja',
      pageIndex: '2',
      rowsPerPage: '25',
      deadStock: 'false',
      proizvodjaci: 'IGNORED-BY-BASE,ALLOWED-BY-PARSED',
    });

    expect(logicService.createFilterFromParams).toHaveBeenCalled();
    expect(robaService.pronadjiSvuRobu).toHaveBeenCalledTimes(1);
    const [, pageSize, pageIndex, searchTerm, filter] = robaService.pronadjiSvuRobu.calls.mostRecent()
      .args as [unknown, number, number, string, Filter];

    expect(pageSize).toBe(25);
    expect(pageIndex).toBe(2);
    expect(searchTerm).toBe('filter ulja');
    expect(filter.deadStock).toBeTrue();
    expect(filter.naStanju).toBeFalse();
    expect(filter.proizvodjaci).toEqual(['FEBI']);
    expect(filter.podgrupe).toEqual(['Hidraulika']);
    expect(filter.filterBy).toBe('SEARCH_TERM' as any);
    expect(component.totalElements).toBe(1);
    expect(component.items.length).toBe(1);
    expect(component.items[0].deadStockInfo?.candidate).toBeTrue();

    component.ngOnDestroy();
  });

  it('keeps admin pagination on the admin route query model', () => {
    const component = createComponent();

    component.handleTablePageEvent({
      pageIndex: 3,
      pageSize: 50,
      length: 0,
      previousPageIndex: 2,
    } as any);

    expect(urlHelperService.addOrUpdateQueryParams).toHaveBeenCalledWith({
      pageIndex: 3,
      rowsPerPage: 50,
    });
  });

  it('shows an admin-specific error message when loading fails', () => {
    robaService.pronadjiSvuRobu.and.returnValue(
      throwError(() => new Error('boom'))
    );
    const component = createComponent();

    component.ngOnInit();
    queryParams$.next({});

    expect(component.loading).toBeFalse();
    expect(component.items).toEqual([]);
    expect(snackbarService.showError).toHaveBeenCalledWith(
      'Učitavanje mrtvog lagera nije uspelo.'
    );

    component.ngOnDestroy();
  });
});
