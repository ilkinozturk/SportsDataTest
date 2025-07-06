# NO MOCK DATA POLICY

## Önemli: Mock Data Kullanılmıyor

Tüm test dosyaları gerçek API verisi kullanacak şekilde güncellenmiştir.

### Güncellenen Dosyalar:

1. **test-goals-display.html**
   - Tüm mockStatistics referansları kaldırıldı
   - Sadece gerçek API verisi kullanılıyor
   - API verisi yoksa testler çalışmıyor

2. **simple-goals-display-test.html**
   - Mock data tamamen kaldırıldı
   - API başarısız olursa test durduruluyor
   - "Cannot continue without real API data" mesajı gösteriliyor

3. **test-goals-display-quick.html**
   - Gerçek team data API'den yükleniyor
   - Mock fallback yok
   - Team ID: 13 (FC Dallas) kullanılıyor

### API Kullanımı:

```javascript
// Her test dosyasında:
const teamService = window.TeamStatsTeamService;
const teamData = await teamService.getTeamData(teamId);

// API verisi yoksa:
if (!statistics) {
    console.error('Cannot run tests without real API data');
    return; // Test çalıştırılmıyor
}
```

### Sunucu Gereksinimleri:

- Sunucu port 3005'te çalışıyor olmalı
- `/api/teams/data?teamId=X` endpoint'i erişilebilir olmalı
- Gerçek takım verileri mevcut olmalı

### Test Edilebilir Takım ID'leri:

- **13** - FC Dallas (USA MLS)
- **836** - Real Madrid (varsa)
- **15** - Manchester United (varsa)
- **2673** - Diğer takımlar

### Notlar:

- Hiçbir durumda mock data kullanılmıyor
- API başarısız olursa testler çalışmıyor
- Tüm veriler gerçek API'den geliyor
- Test bile olsa gerçek veri kullanılıyor