// Schema Type Definitions

export interface FieldMapping {
  source: string | string[];
  target: string;
  defaultValue?: any;
  transform?: (value: any) => any;
  required?: boolean;
}

export interface StatisticFieldDefinition {
  name: string;
  displayName: string;
  category: 'basic' | 'goals' | 'cards' | 'corners' | 'form' | 'advanced';
  suffixFields?: boolean;
  apiField?: string;
  calculation?: string;
}

export interface TeamStatsSchema {
  fields: {
    [key: string]: StatisticFieldDefinition;
  };
  mappings: {
    [key: string]: FieldMapping;
  };
  suffixFields: string[];
  categories: {
    [key: string]: string[];
  };
}

export interface ProcessedStatistics {
  // All statistics fields from TeamStatistics plus processed fields
  [key: string]: any;
}

export interface SchemaMapperOptions {
  includeNullValues?: boolean;
  applyTransformations?: boolean;
  validateRequired?: boolean;
}
