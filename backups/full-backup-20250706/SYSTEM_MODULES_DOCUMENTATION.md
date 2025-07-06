# SportsData.AI Sistem Modülleri ve Fonksiyonları Dokümantasyonu

Bu dokümantasyon, SportsData.AI sisteminde kullanılan tüm modüllerin ve
fonksiyonların detaylı açıklamalarını içerir.

## 📁 Ana Dizin Yapısı

```
/mnt/d/SportsData.Ai/
├── services/              # Servis modülleri
├── utils/                 # Yardımcı araçlar
├── test-*.js             # Test dosyaları
├── simple-server-optimized.js  # Ana sunucu dosyası
└── [diğer dosyalar]
```

## 🔧 Servis Modülleri (/services)

### 1. getChosenLeagueSeasonIdsFinal.js

**Amaç**: Tüm seçili liglerin güncel sezon ID'lerini döndürür.

**Özellikler**:

- 200+ lig için güvenilir sezon tespiti
- Yaz ligleri (tek yıl) ve kış ligleri (iki yıl) desteği
- Özel durumlar (Avustralya, Arjantin, Moldova)
- Retry mekanizması ve hata yönetimi
- Güven seviyeleri (high, medium, low, fallback)

**Kullanım**:

```javascript
const seasonIds = await getChosenLeagueSeasonIdsFinal(apiKey, baseUrl);
// Döner: [{league_name, country, season_id, season_name, confidence, target_year}]
```

### 2. teamDataService.js

**Amaç**: Takım verilerini FootyStats API'den çeker ve işler.

**Ana Fonksiyonlar**:

- `getTeamData(teamId)` - Takımın tüm verilerini getirir
- `fetchTeamStats(teamId)` - API'den takım istatistiklerini çeker
- `resolveLeagueInfo(apiStats)` - Takımın ligini belirler
- `getLeaguePosition(teamId, teamStats, leagueInfo)` - Takımın lig sıralamasını
  bulur

**Özellikler**:

- Akıllı cache sistemi (15 dakika TTL)
- competition_id ile season_id eşleştirmesi
- Ülke bazlı lig bulma
- PPG hesaplaması YOK - sadece API verileri

### 3. getLeagueTable.js

**Amaç**: Lig sıralama tablosunu çeker.

**Ana Fonksiyon**:

```javascript
getTeamPositionFromTable(seasonId, teamId);
// Döner: {position, totalTeams, isReliable}
```

**Özellikler**:

- league-tables endpoint kullanımı
- position: 0 durumunda array index kullanımı
- Güvenilirlik kontrolü

### 4. getTeamPositionUniversal.js

**Amaç**: Evrensel takım pozisyon çözümleyici.

**Özellikler**:

- Farklı API yapılarını handle eder
- Fallback mekanizmaları
- Pozisyon doğrulama

### 5. matchesService.js

**Amaç**: Maç verilerini yönetir.

**Ana Fonksiyonlar**:

- Günlük maç listesi
- Lig bazlı filtreleme
- Cache yönetimi

### 6. footyStatsAPI.js

**Amaç**: FootyStats API ile temel iletişim.

**Endpoint'ler**:

- `/team` - Takım verileri
- `/league-list` - Lig listesi
- `/league-tables` - Lig sıralamaları
- `/league-teams` - Ligteki takımlar
- `/matches` - Maç verileri

### 7. seasonIdResolver.js

**Amaç**: Sezon ID çözümleme yardımcıları.

### 8. dataValidator.js

**Amaç**: API verilerini doğrular.

### 9. dynamicDataFetcher.js

**Amaç**: Dinamik veri çekme stratejileri.

### 10. createCompetitionToSeasonMap.js

**Amaç**: Competition ID'leri Season ID'lere eşleştirir.

## 🛠️ Yardımcı Modüller (/utils)

### 1. LeagueManager.js

**Amaç**: Lig verilerini merkezi olarak yönetir.

**Özellikler**:

- Lig bilgilerini cache'ler
- Lig-sezon eşleştirmesi
- Performans optimizasyonu

### 2. sortUtils.js

**Amaç**: Sıralama yardımcı fonksiyonları.

### 3. leagueMonitor.js

**Amaç**: Lig değişikliklerini takip eder.

## 🚀 Ana Sunucu (simple-server-optimized.js)

**Endpoint'ler**:

- `GET /api/team/:id` - Takım detayları
- `GET /api/matches` - Maç listesi
- `GET /api/leagues` - Lig listesi

**Özellikler**:

- Express.js tabanlı
- CORS desteği
- Cache sistemi (5 dakika TTL)
- Rate limiting (200ms)
- Paralel işleme

## 🧪 Test Dosyaları

### test-final-season-detection.js

**Amaç**: Sezon tespit sistemini test eder.

**Test Kategorileri**:

1. Final Function testi
2. Mevcut fonksiyonla karşılaştırma
3. Kritik lig doğrulama
4. Duplicate kontrolü
5. Veri bütünlüğü
6. Performans testi
7. Spesifik takım doğrulama

### test-final-results.py

**Amaç**: API sonuçlarını doğrular.

**Test Edilen Takımlar**:

- Chicago Fire (USA MLS) - 17/30
- Faroe Islands Team - 8/10
- Australia NPL Team - 8/14
- Brazil Serie B Team - 4/20

## 📊 Veri Akışı

1. **İstek Gelir** → simple-server-optimized.js
2. **Cache Kontrolü** → Varsa cache'ten döner
3. **Team Service** → teamDataService.getTeamData()
4. **API Çağrısı** → FootyStats /team endpoint
5. **Lig Çözümleme** → resolveLeagueInfo()
6. **Sezon Bulma** → getChosenLeagueSeasonIdsFinal()
7. **Pozisyon Çekme** → getLeagueTable.getTeamPositionFromTable()
8. **Sonuç Dönüşü** → JSON response

## 🔐 Güvenlik ve Performans

### Cache Stratejisi

- Team verileri: 15 dakika
- Match verileri: 5 dakika
- Season ID'ler: 1 saat

### Rate Limiting

- Minimum 200ms API çağrıları arası
- Paralel işleme desteği

### Error Handling

- Try-catch blokları
- Fallback mekanizmaları
- Detaylı loglama

## 🌍 Desteklenen Ülkeler ve Ligler

### Yaz Ligleri (Tek Yıl)

USA, Brezilya, Norveç, İsveç, Finlandiya, Çin, Japonya, Güney Kore, Şili,
İzlanda, Faroe Adaları, İrlanda, vb.

### Kış Ligleri (İki Yıl)

İngiltere, İspanya, İtalya, Almanya, Fransa, Türkiye, Hollanda, Belçika, vb.

### Özel Durumlar

- **Avustralya/Yeni Zelanda**: Ekim-Mayıs
- **Arjantin**: Şubat-Aralık
- **Moldova**: Özel formatlaması var

## 🎯 Sistem Hedefleri

1. **Güvenilirlik**: 200+ lig için %100 doğru sezon tespiti
2. **Performans**: Hızlı response süreleri (cache ile <5ms)
3. **Ölçeklenebilirlik**: 200,000+ takım desteği
4. **Bakım Kolaylığı**: Modüler yapı, temiz kod

## 🔄 Güncelleme Notları

- **PPG Kaldırıldı**: Tüm sıralamalar API'den gelir
- **Competition ID Düzeltmesi**: season_id ile doğru eşleştirme
- **Avustralya NPL Düzeltmesi**: 2024 → 2025 sezon geçişi
- **Moldova Formatlaması**: 2025/2026 formatı eklendi

## 📝 Kullanım Örneği

```javascript
// Takım verisi çekme
const teamData = await teamDataService.getTeamData(7); // Chicago Fire

// Sonuç:
{
  teamInfo: { name: "Chicago Fire", ... },
  league: { name: "USA MLS", season_id: 13973 },
  leaguePosition: { position: 17, totalTeams: 30 },
  statistics: { wins: 7, draws: 4, losses: 7, ... },
  matches: [...]
}
```

## 🚨 Dikkat Edilmesi Gerekenler

1. **API Key**: Tüm modüller çevre değişkenlerinden API key alır
2. **Cache Temizleme**: Yanlış veri durumunda cache temizlenmelidir
3. **Sezon Geçişleri**: Haziran-Ağustos arası dikkatli olunmalı
4. **Rate Limiting**: API limit aşımına dikkat edilmeli

---

Bu dokümantasyon, sistemdeki tüm modüllerin temel işlevlerini açıklar. Detaylı
implementasyon için ilgili dosyalara bakınız.
