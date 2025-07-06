// 🧪 OTOMATİK TEST ÖRNEĞİ - Jest Framework

// ❌ MANUEL TEST (Şu anki durumunuz):
// 1. Browser'ı aç
// 2. http://localhost:3002/test-api-client.html'i aç
// 3. "Run Test" butonuna tıkla
// 4. Sonuçları gözle kontrol et

// ✅ OTOMATİK TEST (Olması gereken):

describe('TeamStats API Client', () => {
  
  // Test 1: API Client'ın yüklenmesi
  test('API Client modülü yükleniyor mu?', () => {
    expect(window.TeamStatsAPIClient).toBeDefined();
    expect(typeof TeamStatsAPIClient.getTeamData).toBe('function');
  });

  // Test 2: Team data çekme
  test('Takım verisi başarıyla çekiliyor mu?', async () => {
    const teamData = await TeamStatsAPIClient.getTeamData('15');
    
    expect(teamData).toBeDefined();
    expect(teamData.teamInfo).toBeDefined();
    expect(teamData.teamInfo.id).toBe('15');
  });

  // Test 3: Cache çalışıyor mu?
  test('İkinci çağrı cache'den geliyor mu?', async () => {
    // İlk çağrı
    const start1 = Date.now();
    await TeamStatsAPIClient.getTeamData('15');
    const time1 = Date.now() - start1;
    
    // İkinci çağrı (cache'den gelmeli)
    const start2 = Date.now();
    await TeamStatsAPIClient.getTeamData('15');
    const time2 = Date.now() - start2;
    
    expect(time2).toBeLessThan(time1 / 10); // En az 10x daha hızlı
  });

  // Test 4: Error handling
  test('Hatalı team ID düzgün handle ediliyor mu?', async () => {
    await expect(
      TeamStatsAPIClient.getTeamData('invalid-id')
    ).rejects.toThrow();
  });

  // Test 5: Retry mekanizması
  test('Failed request retry yapıyor mu?', async () => {
    // API'yi geçici olarak boz
    const originalFetch = window.fetch;
    let callCount = 0;
    
    window.fetch = jest.fn(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return originalFetch(...arguments);
    });
    
    // Retry sayesinde başarılı olmalı
    const data = await TeamStatsAPIClient.getTeamData('15');
    expect(data).toBeDefined();
    expect(callCount).toBe(3); // 2 fail + 1 success
    
    window.fetch = originalFetch;
  });
});

describe('State Manager', () => {
  
  let stateManager;
  
  beforeEach(() => {
    stateManager = new TeamStatsStateManager();
  });
  
  test('State değeri set edilip get edilebiliyor mu?', () => {
    stateManager.set('testKey', 'testValue');
    expect(stateManager.get('testKey')).toBe('testValue');
  });
  
  test('setState metodu çalışıyor mu?', () => {
    stateManager.setState({
      key1: 'value1',
      key2: 'value2'
    });
    
    expect(stateManager.get('key1')).toBe('value1');
    expect(stateManager.get('key2')).toBe('value2');
  });
  
  test('Observer pattern çalışıyor mu?', () => {
    const mockCallback = jest.fn();
    
    stateManager.observe('testKey', mockCallback);
    stateManager.set('testKey', 'newValue');
    
    expect(mockCallback).toHaveBeenCalledWith('newValue', undefined);
  });
});

// 🚀 NASIL ÇALIŞIR?

// Terminal'de:
// npm test

// Çıktı:
// PASS  automated-test-example.js
//  TeamStats API Client
//    ✓ API Client modülü yükleniyor mu? (5ms)
//    ✓ Takım verisi başarıyla çekiliyor mu? (523ms)
//    ✓ İkinci çağrı cache'den geliyor mu? (15ms)
//    ✓ Hatalı team ID düzgün handle ediliyor mu? (8ms)
//    ✓ Failed request retry yapıyor mu? (245ms)
//  State Manager
//    ✓ State değeri set edilip get edilebiliyor mu? (2ms)
//    ✓ setState metodu çalışıyor mu? (1ms)
//    ✓ Observer pattern çalışıyor mu? (1ms)
//
// Test Suites: 1 passed, 1 total
// Tests:       8 passed, 8 total
// Time:        0.821s

// 📈 AVANTAJLAR:
// 1. Kod değişince "npm test" yap, 1 saniyede sonuç al
// 2. GitHub'a push edince otomatik çalışır
// 3. Hata varsa deploy olmaz
// 4. Yeni developer gelince sistemin nasıl çalıştığını anlar
// 5. Refactoring yaparken hiçbir şeyi bozmadığından emin olursun