# Test Suite Documentation

## Overview

Bu proje Jest kullanarak unit, integration ve API testleri içerir.

## Test Türleri

### 1. Unit Tests
Mock veriler kullanarak izole edilmiş bileşenleri test eder.

- **Konum**: `tests/unit/`, `tests/repositories/`, `tests/services/`
- **Amaç**: İş mantığını harici bağımlılıklar olmadan test etmek
- **Örnek**: Repository cache logic, service methods

### 2. Integration Tests  
Gerçek API çağrıları yaparak sistemin doğru çalıştığını doğrular.

- **Konum**: `tests/integration/`
- **Amaç**: API entegrasyonunu test etmek
- **Gereksinim**: Gerçek API key (`.env` dosyasında)

### 3. API Route Tests
Express route'larını supertest ile test eder.

- **Konum**: `tests/routes/`
- **Amaç**: HTTP endpoint'lerini test etmek

## Test Çalıştırma

```bash
# Tüm testleri çalıştır
npm test

# Sadece unit testleri
npm run test:unit

# Integration testleri (gerçek API)
npm run test:integration

# Test coverage raporu
npm run test:coverage

# Watch mode (değişiklikleri izle)
npm run test:watch
```

## Gerçek API Testleri

Integration testleri için `.env` dosyasında API key tanımlayın:

```env
FOOTBALL_API_KEY=your-real-api-key-here
API_URL=https://api.football-data-api.com
```

**Not**: Gerçek API testleri rate limit'e tabi olduğundan dikkatli kullanın.

## Mock vs Real API

### Mock API (Unit Tests)
- ✅ Hızlı ve güvenilir
- ✅ Offline çalışır
- ✅ Rate limit yok
- ✅ Edge case'leri test edebilir
- ❌ Gerçek API değişikliklerini yakalamaz

### Real API (Integration Tests)
- ✅ Gerçek veri yapısını doğrular
- ✅ API uyumluluğunu test eder
- ❌ Yavaş
- ❌ Rate limit riski
- ❌ İnternet bağlantısı gerektirir

## Test Yapısı

```
tests/
├── __mocks__/         # Mock modüller
├── unit/              # Unit testler
├── integration/       # Gerçek API testleri
├── repositories/      # Repository testleri
├── services/          # Service testleri  
├── routes/            # Route testleri
└── setup.js           # Jest setup dosyası
```

## Best Practices

1. **Unit testlerde her zaman mock kullanın**
2. **Integration testleri CI/CD'de ayrı çalıştırın**
3. **Sensitive data'yı commitlemeyin**
4. **Test coverage %80+ hedefleyin**
5. **Her PR'da testleri çalıştırın**

## Örnek Test

```javascript
// Unit test örneği
describe('TeamRepository', () => {
  it('should cache data after first fetch', async () => {
    const mockData = { team: 'test' };
    mockService.getTeamData.mockResolvedValue(mockData);
    
    const result = await repository.getTeamStatistics(123);
    
    expect(result).toEqual(mockData);
    expect(mockService.getTeamData).toHaveBeenCalledTimes(1);
  });
});
```