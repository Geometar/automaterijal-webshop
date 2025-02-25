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
  linkageTargetId?: number;
  linkageTargetType?: string;
  subLinkageTargetType?: string;
  description?: string;
  mfrId?: number;
  mfrName?: string;
  mfrShortName?: string;
  vehicleModelSeriesId?: number;
  vehicleModelSeriesName?: string;
  hmdMfrModelId?: number | null;
  hmdMfrModelName?: string | null;
  beginYearMonth?: string;
  endYearMonth?: string | null;
  rmiTypeId?: number;
  axleStyleKey?: number | null;
  axleStyle?: string | null;
  axleTypeKey?: number | null;
  axleType?: string | null;
  axleBodyKey?: number | null;
  axleBody?: string | null;
  wheelMountingKey?: number | null;
  wheelMounting?: string | null;
  axleLoadFromKg?: number | null;
  axleLoadToKg?: number | null;
  axleBodyTypes?: string[] = [];
  brakeTypeKey?: number | null;
  brakeType?: string | null;
  vehicleImages?: VehicleImage[] = [];
  kbaNumbers?: string[] = [];
  driveTypeKey?: number;
  driveType?: string;
  bodyStyleKey?: number;
  bodyStyle?: string;
  valves?: number;
  fuelMixtureFormationTypeKey?: number;
  fuelMixtureFormationType?: string;
  fuelTypeKey?: number;
  fuelType?: string;
  engineTypeKey?: number;
  engineType?: string;
  horsePowerFrom?: number;
  horsePowerTo?: number;
  kiloWattsFrom?: number;
  kiloWattsTo?: number;
  cylinders?: number;
  capacityCC?: number;
  capacityLiters?: number;
  aspirationKey?: number | null;
  aspiration?: string | null;
  cylinderDesignKey?: number | null;
  cylinderDesign?: string | null;
  coolingTypeKey?: number | null;
  coolingType?: string | null;
  boreDiameter?: number | null;
  stroke?: number | null;
  engineConstructionTypeKey?: number | null;
  engineConstructionType?: string | null;
  valveControlKey?: number | null;
  valveControl?: string | null;
  crankshaftBearings?: number | null;
  rpmKwFrom?: number | null;
  salesDescription?: string | null;
  compressionFrom?: number | null;
  compressionTo?: number | null;
  engineManagementKey?: number | null;
  engineManagement?: string | null;
  tonnage?: number | null;
  axleConfigurationKey?: number | null;
  axleConfiguration?: string | null;
  engines?: Engine[] = [];
  axles?: any[] = [];
  cabs?: any[] = [];
  secondaryTypes?: any[] = [];
  wheelBases?: any[] = [];
  vehiclesInOperation?: any[] = [];
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