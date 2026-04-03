// ─── Dataverse Metadata Types ───────────────────────────────────────────────

export interface LocalizedLabel {
  Label: string;
  LanguageCode: number;
}

export interface Label {
  UserLocalizedLabel?: LocalizedLabel;
  LocalizedLabels?: LocalizedLabel[];
}

export interface AttributeMetadata {
  LogicalName: string;
  SchemaName: string;
  DisplayName?: Label;
  AttributeType: string;
  AttributeOf?: string;
  IsLogical?: boolean;
  IsValidODataAttribute?: boolean;
  IsValidForRead?: boolean;
  IsValidForCreate?: boolean;
  IsValidForUpdate?: boolean;
  RequiredLevel?: { Value: string };
  MaxLength?: number;
  MinValue?: number;
  MaxValue?: number;
  IsPrimaryId?: boolean;
  IsPrimaryName?: boolean;
  Description?: Label;
}

export interface RelationshipMetadata {
  SchemaName: string;
  ReferencedEntity?: string;
  ReferencingEntity?: string;
  ReferencedAttribute?: string;
  ReferencingAttribute?: string;
  Entity1LogicalName?: string;
  Entity2LogicalName?: string;
}

export interface EntityMetadata {
  MetadataId: string;
  LogicalName: string;
  SchemaName: string;
  DisplayName?: Label;
  DisplayCollectionName?: Label;
  EntitySetName?: string;
  PrimaryIdAttribute?: string;
  PrimaryNameAttribute?: string;
  IsCustomEntity?: boolean;
  IsActivity?: boolean;
  Description?: Label;
  Attributes?: AttributeMetadata[];
  OneToManyRelationships?: RelationshipMetadata[];
  ManyToOneRelationships?: RelationshipMetadata[];
  ManyToManyRelationships?: RelationshipMetadata[];
}

export interface EntityListItem {
  MetadataId: string;
  LogicalName: string;
  DisplayName?: Label;
  EntitySetName?: string;
  PrimaryIdAttribute?: string;
  PrimaryNameAttribute?: string;
  IsCustomEntity?: boolean;
}

// ─── Dataverse Query Types ───────────────────────────────────────────────────

export interface ODataCollectionResponse<T> {
  "@odata.context"?: string;
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}

export interface QueryDataResult {
  entity_set: string;
  total_count?: number;
  count: number;
  records: Record<string, unknown>[];
  has_more: boolean;
  skip_token?: string;
}
