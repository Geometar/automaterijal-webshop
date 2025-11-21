import { VehicleCategoryType } from '../enums/vehicle-category-type.enum';

export class AssemblyGroup {
  assemblyGroupNodeId?: number;
  assemblyGroupName?: string;
  assemblyGroupType?: string;
  parentNodeId?: number | null;
  children?: number | null;
  count?: number;

  // UI Only
  childrenNodes?: AssemblyGroup[];
}

export class GenericArticles {
  assemblyGroup?: string;
  designation?: string;
  genericArticleId?: number;
  masterDesignation?: string;
  searchTreeNodeId?: number;
  usageDesignation?: string;
}

export class AssemblyGroupDetails {
  assemblyGroupFacetCounts: AssemblyGroup[] = [];
  genericArticles: GenericArticles[] = [];
}


export class TDManufacture {
  favoriteFlag?: number;
  id?: number;
  name?: string;
  type?: string;
}

export class TDModels {
  modelId?: number;
  favoriteFlag?: number;
  name?: string;
  constructedFrom?: number;
  constructedTo?: number;
}

export class TDVehicleDetails {
  aspiration?: string | null;
  aspirationKey?: number | null;
  axleBody?: string | null;
  axleBodyKey?: number | null;
  axleBodyTypes?: string[] = [];
  axleConfiguration?: string | null;
  axleConfigurationKey?: number | null;
  axleLoadFromKg?: number | null;
  axleLoadToKg?: number | null;
  axles?: any[] = [];
  axleStyle?: string | null;
  axleStyleKey?: number | null;
  axleType?: string | null;
  axleTypeKey?: number | null;
  beginYearMonth?: string;
  bodyStyle?: string;
  bodyStyleKey?: number;
  boreDiameter?: number | null;
  brakeType?: string | null;
  brakeTypeKey?: number | null;
  cabs?: any[] = [];
  capacityCC?: number;
  capacityLiters?: number;
  compressionFrom?: number | null;
  compressionTo?: number | null;
  coolingType?: string | null;
  coolingTypeKey?: number | null;
  crankshaftBearings?: number | null;
  cylinderDesign?: string | null;
  cylinderDesignKey?: number | null;
  cylinders?: number;
  description?: string;
  driveType?: string;
  driveTypeKey?: number;
  endYearMonth?: string | null;
  engineConstructionType?: string | null;
  engineConstructionTypeKey?: number | null;
  engineManagement?: string | null;
  engineManagementKey?: number | null;
  engines?: Engine[] = [];
  engineType?: string;
  engineTypeKey?: number;
  fuelMixtureFormationType?: string;
  fuelMixtureFormationTypeKey?: number;
  fuelType?: string;
  fuelTypeKey?: number;
  hmdMfrModelId?: number | null;
  hmdMfrModelName?: string | null;
  horsePowerFrom?: number;
  horsePowerTo?: number;
  kbaNumbers?: string[] = [];
  kiloWattsFrom?: number;
  kiloWattsTo?: number;
  linkageTargetId?: number;
  linkageTargetType?: string;
  mfrId?: number;
  mfrName?: string;
  mfrShortName?: string;
  rmiTypeId?: number;
  rpmKwFrom?: number | null;
  salesDescription?: string | null;
  secondaryTypes?: any[] = [];
  stroke?: number | null;
  subLinkageTargetType?: string;
  tonnage?: number | null;
  valveControl?: string | null;
  valveControlKey?: number | null;
  valves?: number;
  vehicleImages?: VehicleImage[] = [];
  vehicleModelSeriesId?: number;
  vehicleModelSeriesName?: string;
  vehiclesInOperation?: any[] = [];
  wheelBases?: any[] = [];
  wheelMounting?: string | null;
  wheelMountingKey?: number | null;
}

export class VehicleImage {
  imageURL50?: string;
  imageURL100?: string;
  imageURL200?: string;
  imageURL400?: string;
  imageURL800?: string;
}

export class Engine {
  id?: number;
  code?: string;
}

export class TecdocSearchHistory {
  constructor(
    public id: number,
    public type: string,
    public description: string,
    public vehicleType?: VehicleCategoryType
  ) { }
}
