import { WebshopLogicService } from './webshop-logic.service';

describe('WebshopLogicService', () => {
  let service: WebshopLogicService;

  beforeEach(() => {
    service = new WebshopLogicService();
  });

  it('ignores deadStockBadges from customer query params', () => {
    const filter = service.createFilterFromParams({
      deadStock: 'true',
      deadStockBadges: 'Akcija,Rasprodaja',
      proizvodjaci: 'BOSCH',
    });

    expect(filter.deadStock).toBeTrue();
    expect(filter.proizvodjaci).toEqual(['BOSCH']);
    expect(filter.deadStockBadges).toBeUndefined();
  });
});
