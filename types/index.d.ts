// Global type definitions for JavaScript files

// Re-export all types
export * from './api.types';
export * from './schema.types';
export * from './team.types';
export * from './service.types';

// Declare modules for existing JavaScript files
declare module '*/teamDataService' {
  import { TeamDataResponse } from './api.types';

  export class TeamDataService {
    constructor(apiKey: string, baseUrl: string, leagueManager: any);
    getTeamData(teamId: number): Promise<TeamDataResponse>;
    getLeagueTeams(leagueId: number, seasonId?: number): Promise<any>;
  }
}

declare module '*/logger' {
  export class Logger {
    constructor(serviceName: string);
    error(message: string, error?: Error): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    success(message: string, meta?: any): void;
    apiCall(endpoint: string, params: any, response: any, duration: number): void;
  }
}

declare module '*/SchemaMapper' {
  import { TeamStatistics, ProcessedStatistics } from './api.types';
  import { SchemaMapperOptions } from './schema.types';

  export class SchemaMapper {
    constructor();
    mapApiDataToSchema(apiData: any, options?: SchemaMapperOptions): ProcessedStatistics;
  }
}
