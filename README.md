# PC Teklif v1

2. el bilgisayar ticareti icin teklif, kargo, firma, bakiye ve yonetim paneli.

## Ozellikler

- Firma bazli cok kullanicili yapi
- Teklif olusturma, kopyalama, yazdirma ve PDF alma
- Geliver kargo entegrasyonu
- Bakiye yukleme, onay ve ledger akisi
- Firma ve platform yonetimi
- Dashboard, raporlar ve audit log

## Gelistirme

```bash
npm install
npm run dev:server
npm run dev
```

Frontend:

- `http://localhost:5173`

Backend:

- `http://localhost:8787`

## Ortam Degiskenleri

`.env.example` dosyasini `.env` olarak kopyalayin.

Kritik alanlar:

- `GELIVER_API_TOKEN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `DATABASE_URL`

## Production Kurulumu

1. Projeyi sunucuya cekin:

```bash
git clone <repo-url> /var/www/pc-teklif-v1
cd /var/www/pc-teklif-v1
cp .env.example .env
```

2. Ortam degiskenlerini doldurun.

3. Bagimliliklari kurun ve build alin:

```bash
npm install
npm run build
```

4. PM2 ile backend'i baslatin:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

5. `nginx.pcteklif.conf` dosyasini Nginx site ayari olarak kullanin.

## Deploy

Sunucuda:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Notlar

- `.npmrc` dosyasi peer dependency kurulum surtusmesini azaltmak icin `legacy-peer-deps=true` kullanir.
- Varsayilan SQLite yolu `./prisma/dev.db` olarak kullanilmalidir.
