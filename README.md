# NoSQL vs NewSQL Database Performance Comparison

Bu proje, Cassandra, MongoDB ve CockroachDB veritabanlarının karşılaştırmalı performans analizini yapan bir Next.js web uygulamasıdır.

## Özellikler

- **3 Veritabanı Desteği**: Cassandra, MongoDB, CockroachDB
- **Performans Testleri**: Write, Read, Update operasyonları
- **10,000 Kayıt Test**: Her test 10,000 kayıt üzerinde çalışır
- **Veri Bütünlüğü Kontrolü**: Test sonuçlarında veri bütünlüğü doğrulanır
- **Docker Desteği**: Tüm veritabanları Docker container'larında çalışır
- **Güvenlik Testi**: SQL/NoSQL injection koruması gösterimi

## Gereksinimler

- Node.js 18+ 
- Docker ve Docker Compose
- npm veya yarn

## Kurulum

### 1. Projeyi Klonlayın

```bash
cd nosql-newsql-compare
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Environment Değişkenlerini Ayarlayın

`.env.local` dosyası zaten oluşturulmuştur. Gerekirse düzenleyebilirsiniz:

```bash
# Varsayılan değerler Docker Compose ile uyumludur
CASSANDRA_HOST=localhost
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=test_keyspace
CASSANDRA_DATACENTER=datacenter1

MONGODB_URI=mongodb://admin:admin123@localhost:27017/test_db?authSource=admin
MONGODB_DB_NAME=test_db

COCKROACHDB_HOST=localhost
COCKROACHDB_PORT=26257
COCKROACHDB_USER=root
COCKROACHDB_PASSWORD=
COCKROACHDB_DATABASE=test_db
COCKROACHDB_SSL=false
```

### 4. Docker Container'larını Başlatın

**Otomatik Kurulum (Önerilen):**
```bash
npm run setup
```

Bu komut:
- Docker container'larını başlatır
- Veritabanlarının hazır olmasını bekler
- Tüm veritabanlarının çalıştığını doğrular

**Manuel Kurulum:**
```bash
npm run docker:up
```

Bu komut şunları başlatır:
- Cassandra (port 9042)
- MongoDB (port 27017)
- CockroachDB (port 26257, admin UI: 8080)

Veritabanlarının hazır olmasını beklemek için:
```bash
npm run docker:wait
```

Durumu kontrol etmek için:
```bash
npm run docker:logs
```

### 5. Development Server'ı Başlatın

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

## Kullanım

1. Web arayüzünde, her veritabanı için Write, Read ve Update testlerini çalıştırabilirsiniz.
2. Test sonuçları tabloda görüntülenir:
   - Database Name
   - Operation Type
   - Time Taken (ms)
   - Record Count
   - Data Integrity Check (Pass/Fail)
   - Status

## Proje Yapısı

```
nosql-newsql-compare/
├── lib/
│   ├── dbConnectors.ts    # Veritabanı bağlantı modülleri
│   ├── runTest.ts         # Test çalıştırma fonksiyonları
│   ├── types.ts           # TypeScript tip tanımları
│   └── pentest.ts         # Güvenlik test simülasyonu
├── pages/
│   ├── api/
│   │   ├── test/
│   │   │   ├── cassandra.ts
│   │   │   ├── mongo.ts
│   │   │   └── cockroach.ts
│   │   └── pentest.ts
│   └── index.tsx          # Ana sayfa
├── docker-compose.yml      # Docker container yapılandırması
├── package.json
└── README.md
```

## Test Detayları

### Write Test
- 10,000 kayıt oluşturur
- Bulk insert kullanır
- Veri bütünlüğünü doğrular

### Read Test
- 1,000 kayıt okur
- Performansı ölçer
- Veri bütünlüğünü kontrol eder

### Update Test
- 1,000 kayıt günceller
- Performansı ölçer
- Güncellemeleri doğrular

## Docker Komutları

```bash
# Container'ları başlat
npm run docker:up

# Container'ları durdur
npm run docker:down

# Logları görüntüle
npm run docker:logs
```

## Güvenlik Testi

Pentest simülasyonu, SQL ve NoSQL injection saldırılarına karşı koruma mekanizmalarını gösterir. Bu test, parameterized queries ve input validation gibi güvenli kodlama tekniklerinin injection saldırılarına karşı nasıl koruma sağladığını gösterir.

### Test Öncesi Hazırlık

Güvenlik testini çalıştırmadan önce:

1. **Veritabanlarının çalıştığından emin olun:**
   ```bash
   npm run docker:up
   npm run docker:wait
   ```

2. **Test verisi oluşturun (opsiyonel):**
   - Web arayüzünden herhangi bir veritabanı için "Write Testi" çalıştırın
   - Bu, injection testinin daha anlamlı sonuçlar vermesini sağlar

3. **Development server'ın çalıştığından emin olun:**
   ```bash
   npm run dev
   ```

### Test Yöntemleri

#### Yöntem 1: Browser Console (En Hızlı)

1. Tarayıcıda `http://localhost:3000` adresini açın
2. Developer Console'u açın (F12 veya Cmd+Option+I / Ctrl+Shift+I)
3. Console'a aşağıdaki kodu yapıştırın ve Enter'a basın:

```javascript
fetch('/api/pentest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then(res => res.json())
  .then(data => {
    console.log('=== SQL Injection Test Sonucu ===');
    console.log('Korunuyor:', !data.sqlInjection.vulnerable);
    console.log('Mesaj:', data.sqlInjection.message);
    console.log('Sonuç:', data.sqlInjection.result);
    
    console.log('\n=== NoSQL Injection Test Sonucu ===');
    console.log('Korunuyor:', !data.nosqlInjection.vulnerable);
    console.log('Mesaj:', data.nosqlInjection.message);
    console.log('Sonuç:', data.nosqlInjection.result);
  })
  .catch(err => console.error('Hata:', err));
```

#### Yöntem 2: cURL (Terminal)

Terminal'de aşağıdaki komutu çalıştırın:

```bash
curl -X POST http://localhost:3000/api/pentest \
  -H "Content-Type: application/json"
```

Daha okunabilir çıktı için `jq` kullanabilirsiniz:

```bash
curl -X POST http://localhost:3000/api/pentest \
  -H "Content-Type: application/json" | jq
```

#### Yöntem 3: Postman veya Insomnia

1. Yeni bir POST isteği oluşturun
2. **URL:** `http://localhost:3000/api/pentest`
3. **Method:** `POST`
4. **Headers:** 
   - Key: `Content-Type`
   - Value: `application/json`
5. **Body:** Boş bırakabilirsiniz (isteğe bağlı)
6. **Send** butonuna tıklayın

### Beklenen Sonuç

Başarılı bir test sonucu şu şekilde görünmelidir:

```json
{
  "sqlInjection": {
    "vulnerable": false,
    "result": [...],
    "message": "Parameterized query protected against SQL injection. The malicious input was treated as a literal string value."
  },
  "nosqlInjection": {
    "vulnerable": false,
    "result": [...],
    "message": "Explicit query construction and input validation protected against NoSQL injection."
  }
}
```

### Test Ne Yapıyor?

Bu test şu kötü amaçlı girdileri simüle eder:

- **SQL Injection:** `"'; DROP TABLE test_data; --"` - Tabloyu silmeye çalışan SQL kodu
- **NoSQL Injection:** `{ $ne: null }` - MongoDB operatörü ile filtreyi bypass etmeye çalışan kod

Güvenli kodlama teknikleri sayesinde:
- **SQL:** Parameterized queries (`$1` placeholder) kullanılarak kötü amaçlı kod SQL komutu olarak çalıştırılmaz
- **NoSQL:** Açık sorgu oluşturma ve input validation ile MongoDB operatörleri doğrudan kullanılamaz

### API Endpoint

```bash
POST /api/pentest
```

## Sorun Giderme

### Veritabanları Bağlanmıyor

1. Docker container'larının çalıştığından emin olun:
   ```bash
   docker ps
   ```

2. Container'ların sağlık durumunu kontrol edin:
   ```bash
   npm run docker:logs
   ```

3. Portların kullanılabilir olduğundan emin olun (9042, 27017, 26257)

### Test Hataları

- Veritabanlarının tamamen başlamasını bekleyin (ilk başlatmada 30-60 saniye sürebilir)
- `.env.local` dosyasının doğru yapılandırıldığından emin olun
- Console loglarını kontrol edin


## Notlar

- Test verileri her test çalıştırıldığında yeniden oluşturulur
- Veritabanları Docker container'larında çalıştığı için, container'ları durdurduğunuzda veriler kaybolur
- Production ortamında kullanmadan önce güvenlik ayarlarını gözden geçirin

