/**
 * Data Transfer Object for Team Statistics
 * Maps and sanitizes raw API data for client consumption
 */

class TeamStatisticsDTO {
  constructor(rawData) {
    // Raw data'yı al ama FORMATI DEĞİŞTİRME
    // Frontend'in beklediği format korunmalı
    Object.assign(this, rawData);
    
    // Sadece hassas bilgileri temizle
    this.sanitize();
  }
  
  sanitize() {
    // API anahtarları gibi hassas bilgileri kaldır
    delete this._id;
    delete this.apiKey;
    delete this.internalData;
    delete this.debugInfo;
    delete this.cacheTimestamp;
    delete this.__v;
    delete this.createdAt;
    delete this.updatedAt;
    
    // Internal fields that shouldn't be exposed
    delete this._raw;
    delete this._metadata;
    
    return this;
  }
  
  static fromRepository(repoData) {
    return new TeamStatisticsDTO(repoData);
  }
}

module.exports = TeamStatisticsDTO;