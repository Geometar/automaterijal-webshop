import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssemblyGroupsComponent } from './assembly-groups.component';

describe('AssemblyGroupsComponent', () => {
  let component: AssemblyGroupsComponent;
  let fixture: ComponentFixture<AssemblyGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssemblyGroupsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssemblyGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
