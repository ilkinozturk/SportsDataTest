# SportsData.AI Server Management

## 🚀 Server Başlatma

### Geliştirme Modu (Auto-restart)

```bash
./start-server.sh
```

- Dosya değişikliklerini izler (js, html, json)
- Otomatik restart yapar
- Terminal'de çalışır, Ctrl+C ile durdurulur

### Background Modu

```bash
./start-background.sh
```

- Arka planda çalışır
- PID kaydeder
- Log dosyası oluşturur

### Production Daemon (PM2 - isteğe bağlı)

```bash
./start-daemon.sh
```

- PM2 kullanır (kurulu olması gerekir)
- En stabil seçenek

## 🛑 Server Durdurma

```bash
./stop-server.sh
```

## 🔄 Server Restart

```bash
./restart-server.sh
```

## 📊 Server Durumu

### Çalışan Process'leri Kontrol Et

```bash
ps aux | grep simple-server-optimized
```

### Port Kullanımını Kontrol Et

```bash
ss -tlnp | grep :3001
```

### Logları İzle

```bash
tail -f logs/server.log
```

## 🌐 Erişim

- **Ana Sayfa**: http://localhost:3001
- **Takım Listesi**: http://localhost:3001/team-list.html
- **Takım İstatistikleri**: http://localhost:3001/team-stats.html

## 🔧 Otomatik Başlatma

Her güncelleme sonrası server otomatik olarak başlatılması için:

1. **Manual**: `./start-background.sh` çalıştır
2. **Cron Job** (isteğe bağlı):
   ```bash
   # Crontab ekle
   @reboot cd /mnt/d/SportsData.Ai && ./start-background.sh
   ```

## 📁 Dosya Yapısı

- `start-server.sh` - Geliştirme modu (nodemon)
- `start-background.sh` - Background modu
- `start-daemon.sh` - PM2 daemon modu
- `stop-server.sh` - Server durdur
- `restart-server.sh` - Server restart
- `logs/server.log` - Server logları
- `logs/server.pid` - Process ID

## 🚨 Sorun Giderme

### Port zaten kullanımda

```bash
# Portu kullanan process'i bul
lsof -t -i:3001

# Process'i öldür
kill -9 $(lsof -t -i:3001)
```

### Logs kontrol et

```bash
tail -20 logs/server.log
```

### Tüm ilgili process'leri öldür

```bash
pkill -f simple-server-optimized
```
