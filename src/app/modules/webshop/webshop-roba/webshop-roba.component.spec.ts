import { WebshopRobaComponent } from './webshop-roba.component';
import { Filter } from '../../../shared/data-models/model/roba';

describe('WebshopRobaComponent', () => {
  it('does not include deadStockBadges in active chips or filter resets', () => {
    const removeQueryParams = jasmine.createSpy('removeQueryParams');
    const component = new WebshopRobaComponent({
      removeQueryParams,
    } as any);

    component.searchTerm = 'filter';
    component.filter = {
      ...new Filter(),
      deadStockBadges: ['Akcija', 'Rasprodaja'],
      proizvodjaci: ['BOSCH'],
    } as Filter;

    expect(component.activeChips).toEqual(['Pretraga: “filter”', 'Proizvođači: BOSCH']);

    component.resetSearchTerm();
    component.clearAllFilters();

    expect(removeQueryParams).toHaveBeenCalledWith([
      'searchTerm',
      'podgrupe',
      'proizvodjaci',
      'naStanju',
      'filterBy',
    ]);
    expect(removeQueryParams).toHaveBeenCalledWith([
      'podgrupe',
      'proizvodjaci',
      'naStanju',
      'filterBy',
    ]);
  });
});
