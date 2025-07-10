# Colorado Rapids Offside API Test

Bu script Colorado Rapids (Team ID: 12) için API'den gelen offside verilerini
test eder.

## Kullanım

### 1. API Key'i Ayarlayın

Script'te `YOUR_API_KEY_HERE` yazan yeri gerçek API key'inizle değiştirin veya
environment variable kullanın:

```bash
export API_KEY=your_actual_api_key
```

### 2. Script'i Çalıştırın

Default season ID (5825) ile:

```bash
node test-colorado-offside-api.js
```

Farklı bir season ID ile:

```bash
node test-colorado-offside-api.js 5826
```

### 3. Çıktıyı İnceleyin

Script şunları gösterecek:

- Tüm offside ile ilgili field'lar ve değerleri
- Over 2.5 ve Over 3.5 offside yüzdeleri
- Mantık kontrolü (Over 3.5 > Over 2.5 ise uyarı verir)
- Ham API yanıtı

## Beklenen Sorunlar

Eğer API'de gerçekten Over 3.5 > Over 2.5 ise, bu durumda:

1. API'deki veri yanlış olabilir
2. Field isimleri karışmış olabilir
3. Veriler farklı bir şeyi temsil ediyor olabilir

## Örnek Çıktı

```
AWAY Venue:
  Over 2.5: 22%
  Over 3.5: 44%
  ⚠️  LOGIC ERROR: Over 3.5 (44%) is GREATER than Over 2.5 (22%)
  This is mathematically impossible!
```
