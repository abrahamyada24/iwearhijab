# LitePOS Warna Warni

> Sistem kasir retail untuk toko boneka Warna Warni, dengan pengelolaan produk, stok, pelanggan, shift, penjualan, dan laporan.

[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/mysql-%3E%3D8.0-orange.svg)](https://www.mysql.com/)

---

## 📋 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Unggulan](#-fitur-unggulan)
- [Teknologi](#-teknologi)
- [Arsitektur Database](#-arsitektur-database)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Penggunaan](#-penggunaan)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Kontribusi](#-kontribusi)

---

## 🎯 Tentang Proyek

LitePOS Warna Warni adalah sistem Point of Sale retail yang berfokus pada **integritas transaksi**, **akurasi stok**, dan operasi toko sehari-hari.

### Mengapa Savoria POS?

- ✅ **Database-First Security** - Validasi di layer database, bukan hanya frontend
- ✅ **ACID Compliance** - Atomic transactions untuk konsistensi data 100%
- ✅ **Snapshot Pattern** - Harga historis terjaga untuk akurasi laporan
- ✅ **Real-time Stock Tracking** - Audit trail lengkap untuk setiap pergerakan stok
- ✅ **Multi-Payment Support** - Cash & QRIS dengan rekonsiliasi otomatis

> *"Keamanan data bukan tentang seberapa canggih enkripsi Anda, tapi tentang seberapa jujur database Anda mencatat setiap butir transaksi."*

---

## ✨ Fitur Unggulan

### 🔐 Manajemen User & Akses
- Role-based access control (Admin & Cashier)
- Password encryption dengan bcrypt
- Session management yang aman

### 📦 Manajemen Produk
- Kategori produk dinamis
- SKU unik untuk setiap produk
- Upload gambar produk (lokal storage)
- Tracking HPP (Harga Pokok Penjualan)
- Status aktif/nonaktif produk

### 💰 Sistem Transaksi
- Generate invoice number otomatis (Format: `INV/YYYYMMDD/XXXX`)
- Multi-item transaction
- Perhitungan pajak otomatis
- Sistem diskon fleksibel
- Status transaksi (PAID, PENDING, CANCELLED)

### 📊 Manajemen Stok
- Real-time stock monitoring
- Stock movement logging (IN/OUT)
- Sumber pergerakan (SALE, PURCHASE, ADJUSTMENT)
- Snapshot stok untuk audit trail

### 👥 Database Pelanggan
- Profil pelanggan lengkap
- Tracking history pembelian
- Nomor telepon & email unik

### 💳 Multi-Payment
- Cash payment
- QRIS integration
- Reference ID tracking untuk pembayaran digital

### ⚙️ Pengaturan Toko
- Konfigurasi nama toko
- Custom logo
- Atur tarif pajak
- Customizable receipt footer

---

## 🛠 Teknologi

### Backend
- **Node.js** (v18+)
- **Express.js** - Web framework
- **Prisma ORM** - Database toolkit
- **MySQL** - Relational database
- **Multer** - File upload handling
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **React.js** / **Next.js**
- **Tailwind CSS**
- **Axios** - HTTP client

---

## 🗄 Arsitektur Database

### 🛡️ Filosofi: Database Adalah Benteng Terakhir

Bayangkan skenario nightmare: Restoran Anda berada di puncak kesibukan jam makan siang. Antrean pelanggan memanjang, kasir bekerja secepat kilat. Seorang kasir melayani transaksi besar dengan 10 menu berbeda. Saat tombol "Bayar" ditekan, sistem terlihat memproses pesanan, namun tiba-tiba koneksi database terputus atau laptop kasir hang.

Di layar mungkin muncul pesan "Gagal", tetapi di latar belakang, database sudah terlanjur mengurangi stok bahan baku tanpa sempat mencatat uang pembayaran yang masuk. Hasilnya? Di akhir bulan, Anda mendapati selisih jutaan rupiah antara stok fisik dan catatan digital.

**Penyebab utama**: Arsitektur database yang rapuh dan menganggap validasi di Frontend sudah cukup.

### ⚠️ Mengapa Validasi di Frontend Saja Adalah "Ilusi Keamanan"?

Banyak developer pemula terjebak dalam pola pikir bahwa dengan memberikan validasi `if (stock > 0)` di JavaScript atau menyembunyikan tombol "Bayar" saat stok habis, aplikasi mereka sudah aman. Padahal, itu hanyalah **Security Theater** (pertunjukan keamanan).

Seseorang yang memiliki niat jahat atau sekadar "penasaran" bisa dengan mudah:

- **Modifikasi Kode**: Mengubah nilai variabel JavaScript melalui browser console secara real-time
- **Direct API Call**: Memanggil API endpoint `/api/transactions` secara langsung menggunakan Postman tanpa melewati validasi UI
- **Replay Attack**: Mengirimkan request palsu untuk mengubah harga produk menjadi Rp 0 atau jumlah stok menjadi negatif

**Real Security** adalah pertahanan di lapisan terakhir, yaitu **Database Layer**. Jika database memiliki logika untuk menolak penulisan data yang tidak valid, maka tidak peduli seberapa hebat "serangan" di sisi Frontend, data bisnis Anda akan tetap utuh.

---

### 📐 Blueprint: Entity Relationship Diagram (ERD)

Savoria POS dibangun di atas MySQL dengan struktur **9 tabel utama** yang dirancang dengan relasi ketat menggunakan **Foreign Key** dan **Constraints** untuk menjamin konsistensi data tingkat tinggi.

```sql
Table users {
  id int [pk, increment]
  name varchar
  email varchar [unique]
  password text
  role varchar [note: 'ADMIN, CASHIER']
  is_active boolean
  created_at timestamp
  updated_at timestamp
}

Table categories {
  id int [pk, increment]
  name varchar
}

Table products {
  id int [pk, increment]
  category_id int [ref: > categories.id]
  sku varchar [unique]
  name varchar
  image_url text
  description text [note: 'Optimalisasi kecepatan sinkronisasi']
  price decimal
  cost_price decimal [note: 'HPP untuk perhitungan profit']
  stock int
  is_active boolean
  created_at timestamp
  updated_at timestamp
}

Table customers {
  id int [pk, increment]
  name varchar
  phone varchar [unique]
  email varchar
  created_at timestamp
}

Table transactions {
  id int [pk, increment]
  invoice_number varchar [unique]
  user_id int [ref: > users.id]
  customer_id int [ref: > customers.id]
  sub_total decimal
  tax_amount decimal
  discount_amount decimal
  grand_total decimal
  status varchar [note: 'PAID, PENDING, CANCELLED']
  created_at timestamp
}

Table transaction_items {
  id int [pk, increment]
  transaction_id int [ref: > transactions.id]
  product_id int [ref: > products.id]
  qty int
  price decimal [note: 'Snapshot harga jual saat kejadian']
  cost_price decimal [note: 'Snapshot HPP saat kejadian']
}

Table payments {
  id int [pk, increment]
  transaction_id int [ref: > transactions.id]
  payment_type varchar [note: 'CASH, QRIS']
  amount decimal
  reference_id varchar [note: 'Order ID / Ref ID']
  created_at timestamp
}

Table stock_movements {
  id int [pk, increment]
  product_id int [ref: > products.id]
  type varchar [note: 'IN, OUT']
  qty int
  current_stock int [note: 'Snapshot stok saat log dicatat']
  source varchar [note: 'SALE, PURCHASE, ADJUSTMENT']
  created_at timestamp
}

Table store_settings {
  id int [pk, increment]
  store_name varchar
  logo_url text
  tax_rate decimal
  receipt_footer text
}
```

**Visualisasi Relasi:**

```
                    ┌─────────────────┐
                    │  store_settings │
                    └─────────────────┘
                           
    ┌──────────────────────────────────────────────────┐
    │                                                  │
┌───▼────┐                                      ┌──────▼──────┐
│ users  │                                      │ categories  │
└───┬────┘                                      └──────┬──────┘
    │                                                  │
    │         ┌────────────┐                    ┌──────▼──────┐
    │         │ customers  │                    │  products   │
    │         └─────┬──────┘                    └──────┬──────┘
    │               │                                  │
    │               │                                  │
    └───────┬───────┴──────────────────────────┬──────┴──────┐
            │                                  │             │
     ┌──────▼──────────┐                ┌──────▼────────┐    │
     │  transactions   │                │ stock_movements│    │
     └──────┬──────────┘                └───────────────┘    │
            │                                                │
            ├────────────────┬───────────────────────────────┘
            │                │
     ┌──────▼──────┐  ┌──────▼────────────┐
     │  payments   │  │ transaction_items │
     └─────────────┘  └───────────────────┘
```

---

## 🔍 Bedah Fungsi Tabel: Mengapa Mereka Ada? (Deep Dive)

Memahami tabel bukan hanya soal nama kolom, tapi soal **perannya dalam menjaga kesehatan bisnis**:

### 1️⃣ Table: `users`

**Peran**: Mengontrol siapa yang memegang kendali sistem

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role ENUM('ADMIN', 'CASHIER') DEFAULT 'CASHIER',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Fungsi Bisnis**:
- `role`: Membedakan akses antara **pemilik** (melihat profit, HPP) dan **kasir** (melayani pelanggan)
- `is_active`: Soft delete untuk nonaktifkan akun tanpa menghapus history transaksi
- `email unique`: Mencegah duplikasi akun

**Use Case**: Admin bisa melihat laporan profit dengan HPP, sementara kasir hanya bisa input transaksi tanpa tahu margin keuntungan.

---

### 2️⃣ Table: `categories`

**Peran**: Pengelompokan menu untuk navigasi kasir yang cepat

```sql
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
```

**Fungsi Bisnis**:
- Memudahkan kasir mencari menu (Makanan, Minuman, Dessert, dll)
- Dinamis: Admin bisa tambah/edit kategori tanpa coding

**Use Case**: Kasir cukup klik kategori "Minuman" untuk melihat semua menu minuman, tidak perlu scroll panjang.

---

### 3️⃣ Table: `products`

**Peran**: Menyimpan rahasia dapur (cost_price/HPP)

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL COMMENT 'HPP untuk perhitungan profit',
  stock INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**Fungsi Bisnis**:
- `cost_price`: **RAHASIA** yang tidak boleh bocor ke kasir atau pelanggan. Ini adalah harga modal untuk hitung margin profit
- `sku`: Kode unik produk untuk inventory tracking
- `is_active`: Produk bisa dinonaktifkan sementara tanpa dihapus

**Use Case**: Harga jual Nasi Goreng Rp 25.000, tapi HPP-nya Rp 12.000. Profit Rp 13.000 hanya bisa dilihat Admin.

---

### 4️⃣ Table: `customers`

**Peran**: Database pelanggan untuk loyalitas

```sql
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fungsi Bisnis**:
- Tracking frekuensi kunjungan
- Memudahkan promo repeat customer
- `phone unique`: Satu nomor = satu customer

**Use Case**: Customer "Budi" sudah 10x beli, sistem bisa kasih diskon otomatis.

---

### 5️⃣ Table: `transactions`

**Peran**: Header utama janji pembayaran

```sql
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  customer_id INT,
  sub_total DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) NOT NULL,
  status ENUM('PAID', 'PENDING', 'CANCELLED') DEFAULT 'PAID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

**Fungsi Bisnis**:
- `invoice_number`: Nomor unik format **INV/YYYYMMDD/XXXX** (contoh: INV/20260128/0001)
- `status`: PENDING untuk pembayaran cicilan, CANCELLED untuk void transaksi
- `tax_amount`: Pajak dihitung otomatis dari `store_settings.tax_rate`

**Use Case**: Jika ada komplain, tinggal cari berdasarkan nomor invoice untuk investigasi.

---

### 6️⃣ Table: `transaction_items` ⭐ **KOMPONEN PALING VITAL**

**Peran**: The Snapshot Pattern - Menyimpan harga produk pada detik transaksi terjadi

```sql
CREATE TABLE transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  price DECIMAL(10,2) NOT NULL COMMENT 'Snapshot harga jual saat kejadian',
  cost_price DECIMAL(10,2) NOT NULL COMMENT 'Snapshot HPP saat kejadian',
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Fungsi Bisnis (CRITICAL)**:
- **Snapshot Pattern**: Jika besok harga Nasi Goreng naik dari Rp 25.000 menjadi Rp 30.000, laporan keuangan bulan lalu **TIDAK AKAN TERPENGARUH**
- `cost_price` juga di-snapshot untuk hitung profit historis yang akurat
- Mencegah data corruption saat harga produk berubah

**Use Case**: 
```
Januari 2026: Jual Nasi Goreng Rp 25.000 (HPP Rp 12.000) → Profit Rp 13.000
Februari 2026: Harga naik jadi Rp 30.000 (HPP Rp 15.000)
Laporan Januari tetap menunjukkan profit Rp 13.000 (BENAR ✅)
Tanpa snapshot, sistem akan hitung ulang pakai harga baru (SALAH ❌)
```

---

### 7️⃣ Table: `payments`

**Peran**: Memisahkan entitas transaksi dan metode bayar

```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  payment_type ENUM('CASH', 'QRIS') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_id VARCHAR(100) COMMENT 'Order ID / Ref ID untuk QRIS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);
```

**Fungsi Bisnis**:
- Rekonsiliasi keuangan lebih akurat antara uang fisik (CASH) dan digital (QRIS)
- `reference_id`: Menyimpan Order ID dari payment gateway untuk tracking

**Use Case**: Di akhir hari, kasir hitung uang cash di laci harus sama dengan total payment_type='CASH'. Untuk QRIS, cek di dashboard payment gateway.

---

### 8️⃣ Table: `stock_movements` 📹 **CCTV Digital Stok**

**Peran**: Melacak setiap butir barang yang masuk/keluar

```sql
CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  type ENUM('IN', 'OUT') NOT NULL,
  qty INT NOT NULL,
  current_stock INT NOT NULL COMMENT 'Snapshot stok saat log dicatat',
  source ENUM('SALE', 'PURCHASE', 'ADJUSTMENT') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Fungsi Bisnis**:
- **Audit Trail**: Siapa, kapan, kenapa stok berkurang/bertambah
- `type`: IN (restok), OUT (terjual/rusak)
- `source`: Alasan perubahan (SALE=terjual, PURCHASE=beli dari supplier, ADJUSTMENT=koreksi manual)
- `current_stock`: Snapshot stok saat kejadian untuk investigasi

**Use Case**: 
```
Stok Nasi Goreng: 100 porsi
- 10 porsi terjual (OUT, SALE) → Sisa 90
- 50 porsi restock (IN, PURCHASE) → Sisa 140
- 5 porsi rusak (OUT, ADJUSTMENT) → Sisa 135
```

Jika ada selisih stok, tinggal cek log ini untuk investigasi.

---

### 9️⃣ Table: `store_settings`

**Peran**: Mengontrol identitas toko secara global

```sql
CREATE TABLE store_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0 COMMENT 'Dalam persen, misal 10.00 = 10%',
  receipt_footer TEXT
);
```

**Fungsi Bisnis**:
- `tax_rate`: Pajak dihitung otomatis di semua transaksi tanpa hardcode
- `receipt_footer`: Custom text di bawah struk (misal: "Terima kasih, datang lagi!")
- Perubahan bisa dilakukan tanpa menyentuh kode program

**Use Case**: Jika pemerintah ubah pajak dari 10% jadi 11%, cukup edit di settings, semua transaksi otomatis pakai tarif baru.

---

## 🔐 Logika Keamanan: Atomic Transactions (The "All or Nothing" Rule)

Savoria POS menggunakan fitur **Prisma `$transaction`** untuk menjamin data selalu sinkron. Dalam standar industri, ini disebut prinsip **ACID** (Atomicity, Consistency, Isolation, Durability).

### Proses Checkout Kasir:

```javascript
await prisma.$transaction(async (tx) => {
  // 1. CHECK: Cek ketersediaan stok fisik di MySQL
  const product = await tx.products.findUnique({ where: { id: productId } });
  if (product.stock < qty) throw new Error('Stok tidak cukup');
  
  // 2. INVOICE: Generate nomor struk unik
  const invoiceNumber = `INV/${date}/0001`;
  
  // 3. SNAPSHOT: Salin harga produk saat ini ke detail transaksi
  await tx.transaction_items.create({
    data: {
      price: product.price,        // Snapshot harga jual
      cost_price: product.cost_price  // Snapshot HPP
    }
  });
  
  // 4. DEDUCT: Kurangi stok gudang
  await tx.products.update({
    where: { id: productId },
    data: { stock: { decrement: qty } }
  });
  
  // 5. AUDIT: Catat alasan pengurangan stok di kartu kontrol
  await tx.stock_movements.create({
    data: {
      type: 'OUT',
      source: 'SALE',
      qty: qty,
      current_stock: product.stock - qty
    }
  });
});
```

**PENTING**: Jika salah satu langkah gagal (misal: stok tiba-tiba tidak cukup karena kasir lain checkout bersamaan), database akan melakukan **Rollback otomatis**. Langkah yang sudah sukses akan dibatalkan seolah tidak pernah terjadi. **Data Anda dijamin 100% sinkron**.

---

## 📊 Keunggulan Arsitektur Database Savoria POS

| Fitur | Penjelasan | Manfaat Bisnis |
|-------|------------|----------------|
| **Foreign Key Constraints** | Relasi antar tabel dijamin MySQL | Tidak mungkin ada transaksi tanpa produk valid |
| **Unique Constraints** | Email, SKU, Phone unique | Mencegah data duplikat |
| **Snapshot Pattern** | Harga & HPP disimpan saat transaksi | Laporan historis tetap akurat meski harga berubah |
| **Atomic Transactions** | All-or-nothing database operation | Stok dan uang selalu sinkron 100% |
| **Audit Trail** | Stock movements log semua perubahan | Investigasi selisih stok mudah |
| **Soft Delete** | is_active flag | Data tidak hilang permanen |
| **Timestamp Tracking** | created_at & updated_at otomatis | Tracking kapan data berubah |

---

### 🎯 Mengapa Blueprint Ini Begitu Berharga?

Sistem POS dengan integritas data seperti ini biasanya hanya ditemukan pada aplikasi **enterprise berbayar mahal**. Dengan mempelajari arsitektur Savoria POS, Anda tidak hanya belajar koding, tetapi belajar bagaimana membangun **fondasi bisnis yang aman dan profesional**.

> *"Keamanan data bukan tentang seberapa canggih enkripsi Anda, tapi tentang seberapa jujur database Anda mencatat setiap butir transaksi."*

---

## 🚀 Instalasi

### Prasyarat

- Node.js >= 18.0.0
- MySQL >= 8.0
- XAMPP / LAMP / MAMP (untuk database lokal)
- npm atau yarn

### Langkah Instalasi


1. **Install Dependencies**
```bash
# Backend
cd pos-be
npm install

# Frontend
cd ../pos-fe
npm install
```

2. **Setup Database**
```bash
# Buka MySQL dan buat database
mysql -u root -p
CREATE DATABASE pos_db;
exit;
```

3. **Konfigurasi Environment**
```bash
# Backend (.env)
cp .env.example .env
# Edit file .env sesuai konfigurasi Anda
```

4. **Generate Prisma Client**
```bash
cd pos-be
npx prisma generate
npx prisma db push
```

5. **Seed Data (Opsional)**
```bash
npm run seed
```

6. **Jalankan Aplikasi**
```bash
# Backend (Terminal 1)
cd pos-be
npm run dev

# Frontend (Terminal 2)
cd pos-fe
npm run dev
```

---

## ⚙️ Konfigurasi

### Backend (.env)

```env
# Database Configuration
DATABASE_URL="mysql://root:@localhost:3306/pos_db"

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Upload Configuration
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5242880
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_UPLOAD_URL=http://localhost:5000/uploads
```

---

## 💻 Penggunaan

### Default Login Credentials

```
Admin:
Email: admin@savoria.com
Password: admin123

Cashier:
Email: cashier@savoria.com
Password: cashier123
```

### Workflow Transaksi

1. **Login** sebagai kasir
2. **Pilih produk** dari menu
3. **Tambahkan ke keranjang** dengan quantity
4. **Input data pelanggan** (opsional)
5. **Pilih metode pembayaran** (Cash/QRIS)
6. **Proses pembayaran** - Sistem akan:
   - Generate invoice unik
   - Snapshot harga produk saat ini
   - Kurangi stok otomatis
   - Catat movement log
   - Validasi dengan atomic transaction
7. **Cetak struk** pembayaran

---

## 📚 API Documentation

## 🚀 Peta Navigasi API: Jembatan Frontend ke Backend

Untuk memudahkan pengembangan, berikut adalah daftar endpoint utama yang digunakan aplikasi untuk berinteraksi dengan database. **Semua rute selain Auth membutuhkan Header `Authorization: Bearer <token>`**.

---

### A. Modul Autentikasi (`/api/auth`)

#### 1. POST `/api/auth/login`
**Fungsi**: Inisiasi login & pengiriman kode OTP ke email

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@savoria.com",
  "password": "admin123"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Kode OTP telah dikirim ke email Anda",
  "data": {
    "email": "admin@savoria.com"
  }
}
```

---

#### 2. POST `/api/auth/verify-otp`
**Fungsi**: Validasi kode & pemberian Token JWT akses

**Request:**
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "admin@savoria.com",
  "otp_code": "123456"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Admin Savoria",
      "email": "admin@savoria.com",
      "role": "ADMIN"
    }
  }
}
```

---

#### 3. POST `/api/auth/register`
**Fungsi**: (Admin Only) Mendaftarkan pegawai baru + Upload foto profil

**Request:**
```http
POST /api/auth/register
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

{
  "name": "Kasir Baru",
  "email": "kasir@savoria.com",
  "password": "password123",
  "role": "CASHIER",
  "profile_image": <file>
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "User berhasil didaftarkan",
  "data": {
    "id": 2,
    "name": "Kasir Baru",
    "email": "kasir@savoria.com",
    "role": "CASHIER"
  }
}
```

---

### B. Modul Produk & Inventaris (`/api/products`)

#### 1. GET `/api/products`
**Fungsi**: Mengambil semua daftar menu (Mendukung search & filter kategori)

**Request:**
```http
GET /api/products?search=nasi&category_id=1&page=1&limit=10
Authorization: Bearer <token>
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "sku": "PRD-001",
        "name": "Nasi Goreng Spesial",
        "category": {
          "id": 1,
          "name": "Makanan"
        },
        "price": 25000,
        "stock": 50,
        "image_url": "/uploads/nasi-goreng.jpg",
        "is_active": true
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "total_pages": 10
    }
  }
}
```

---

#### 2. POST `/api/products`
**Fungsi**: (Admin) Menambah menu baru beserta upload foto ke folder lokal

**Request:**
```http
POST /api/products
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

{
  "category_id": 1,
  "sku": "PRD-002",
  "name": "Ayam Geprek",
  "description": "Ayam goreng dengan sambal pedas",
  "price": 20000,
  "cost_price": 10000,
  "stock": 30,
  "image": <file>
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Produk berhasil ditambahkan",
  "data": {
    "id": 2,
    "sku": "PRD-002",
    "name": "Ayam Geprek",
    "price": 20000,
    "cost_price": 10000,
    "stock": 30,
    "image_url": "/uploads/ayam-geprek.jpg"
  }
}
```

---

#### 3. PUT `/api/products/:id`
**Fungsi**: (Admin) Mengupdate detail menu, harga, atau stok

**Request:**
```http
PUT /api/products/2
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Ayam Geprek Jumbo",
  "price": 25000,
  "cost_price": 12000,
  "stock": 50
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Produk berhasil diupdate",
  "data": {
    "id": 2,
    "name": "Ayam Geprek Jumbo",
    "price": 25000,
    "cost_price": 12000,
    "stock": 50
  }
}
```

---

#### 4. DELETE `/api/products/:id`
**Fungsi**: (Admin) Menghapus produk dari database

**Request:**
```http
DELETE /api/products/2
Authorization: Bearer <admin_token>
```

**Response Success:**
```json
{
  "success": true,
  "message": "Produk berhasil dihapus"
}
```

---

#### 5. GET `/api/products/categories`
**Fungsi**: Mengambil semua daftar kategori menu

**Request:**
```http
GET /api/products/categories
Authorization: Bearer <token>
```

**Response Success:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Makanan"
    },
    {
      "id": 2,
      "name": "Minuman"
    },
    {
      "id": 3,
      "name": "Dessert"
    }
  ]
}
```

---

### C. Modul Transaksi & Kasir (`/api/transactions`)

#### 1. POST `/api/transactions` ⭐ **[Core Function]**
**Fungsi**: Melakukan proses checkout, atomic transaction, dan request Midtrans Snap Token

**Request:**
```http
POST /api/transactions
Content-Type: application/json
Authorization: Bearer <token>

{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "qty": 2
    },
    {
      "product_id": 2,
      "qty": 1
    }
  ],
  "payment_type": "QRIS",
  "discount_amount": 5000
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Transaksi berhasil dibuat",
  "data": {
    "transaction": {
      "id": 1,
      "invoice_number": "INV/20260128/0001",
      "sub_total": 70000,
      "tax_amount": 7000,
      "discount_amount": 5000,
      "grand_total": 72000,
      "status": "PAID"
    },
    "midtrans": {
      "snap_token": "abc123xyz",
      "redirect_url": "https://app.midtrans.com/snap/v2/..."
    }
  }
}
```

**Catatan Penting**:
- Endpoint ini menggunakan **Atomic Transaction** untuk menjamin:
  1. Validasi stok tersedia
  2. Generate invoice number unik
  3. Snapshot harga & HPP
  4. Pengurangan stok otomatis
  5. Pencatatan stock movement
  6. Integrasi Midtrans untuk QRIS
- Jika salah satu step gagal, semua operasi di-rollback

---

#### 2. GET `/api/transactions`
**Fungsi**: Melihat riwayat transaksi (Mendukung filter tanggal dan pagination)

**Request:**
```http
GET /api/transactions?start_date=2026-01-01&end_date=2026-01-31&status=PAID&page=1&limit=20
Authorization: Bearer <token>
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "invoice_number": "INV/20260128/0001",
        "customer": {
          "name": "Budi Santoso"
        },
        "grand_total": 72000,
        "status": "PAID",
        "created_at": "2026-01-28T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "total_pages": 8
    }
  }
}
```

---

#### 3. GET `/api/transactions/:id`
**Fungsi**: Mengambil detail satu transaksi lengkap untuk kebutuhan cetak struk

**Request:**
```http
GET /api/transactions/1
Authorization: Bearer <token>
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV/20260128/0001",
    "customer": {
      "name": "Budi Santoso",
      "phone": "081234567890"
    },
    "cashier": {
      "name": "Kasir 1"
    },
    "items": [
      {
        "product_name": "Nasi Goreng Spesial",
        "qty": 2,
        "price": 25000,
        "subtotal": 50000
      },
      {
        "product_name": "Es Teh Manis",
        "qty": 2,
        "price": 5000,
        "subtotal": 10000
      }
    ],
    "sub_total": 60000,
    "tax_amount": 6000,
    "discount_amount": 5000,
    "grand_total": 61000,
    "payment": {
      "type": "CASH",
      "amount": 61000
    },
    "created_at": "2026-01-28T10:30:00Z"
  }
}
```

---

### D. Modul Laporan & Statistik (`/api/reports`)

#### 1. GET `/api/reports/dashboard`
**Fungsi**: Mengambil ringkasan omset, profit, top products, dan data chart

**Request:**
```http
GET /api/reports/dashboard?start_date=2026-01-01&end_date=2026-01-31
Authorization: Bearer <admin_token>
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_revenue": 50000000,
      "total_profit": 20000000,
      "total_transactions": 1250,
      "avg_transaction": 40000
    },
    "top_products": [
      {
        "product_name": "Nasi Goreng Spesial",
        "total_sold": 350,
        "revenue": 8750000
      }
    ],
    "chart_data": {
      "daily_revenue": [
        {
          "date": "2026-01-01",
          "revenue": 1500000
        }
      ]
    }
  }
}
```

---

#### 2. GET `/api/reports/export`
**Fungsi**: Mengunduh file CSV laporan penjualan berdasarkan rentang tanggal

**Request:**
```http
GET /api/reports/export?start_date=2026-01-01&end_date=2026-01-31&format=csv
Authorization: Bearer <admin_token>
```

**Response Success:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="laporan-penjualan-2026-01.csv"

Invoice,Tanggal,Customer,Total,Status
INV/20260101/0001,2026-01-01,Budi,50000,PAID
INV/20260101/0002,2026-01-01,Ani,75000,PAID
```

---

### E. Modul Pelanggan & Gudang (`/api/customers` & `/api/inventory`)

#### 1. GET `/api/customers`
**Fungsi**: List member dan statistik total belanja mereka

**Request:**
```http
GET /api/customers?search=budi&page=1&limit=10
Authorization: Bearer <token>
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 1,
        "name": "Budi Santoso",
        "phone": "081234567890",
        "email": "budi@email.com",
        "total_transactions": 15,
        "total_spent": 1250000,
        "last_visit": "2026-01-28T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10
    }
  }
}
```

---

#### 2. POST `/api/inventory/adjustment`
**Fungsi**: (Admin) Melakukan Stock Opname (Koreksi stok masuk/keluar secara manual)

**Request:**
```http
POST /api/inventory/adjustment
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "product_id": 1,
  "type": "IN",
  "qty": 50,
  "source": "PURCHASE",
  "notes": "Restock dari supplier PT. ABC"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Stock adjustment berhasil",
  "data": {
    "product": {
      "name": "Nasi Goreng Spesial",
      "previous_stock": 20,
      "new_stock": 70
    },
    "movement": {
      "type": "IN",
      "qty": 50,
      "source": "PURCHASE",
      "created_at": "2026-01-28T14:00:00Z"
    }
  }
}
```

---

## 🔑 Authentication Header

Semua endpoint (kecuali `/api/auth/login` dan `/api/auth/verify-otp`) **WAJIB** menyertakan token JWT di header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Error Response (Unauthorized):**
```json
{
  "success": false,
  "message": "Token tidak valid atau sudah kadaluarsa"
}
```

---

## 📝 Standard Error Response

Semua error mengikuti format standar:

```json
{
  "success": false,
  "message": "Pesan error yang jelas",
  "errors": [
    {
      "field": "email",
      "message": "Email tidak valid"
    }
  ]
}
```

**HTTP Status Code:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validasi gagal)
- `401` - Unauthorized (Token invalid)
- `403` - Forbidden (Tidak ada akses)
- `404` - Not Found
- `500` - Internal Server Error

---

> 📖 Untuk testing API, gunakan tools seperti **Postman** atau **Insomnia**. Import collection dari folder `/docs/postman` untuk mempercepat development.

---

## 🔧 Troubleshooting

### Problem: Database connection error

**Solusi:**
```bash
# Check MySQL service
# Windows (XAMPP)
- Pastikan MySQL service running di XAMPP Control Panel

# Verify database exists
mysql -u root -p
SHOW DATABASES;
```

### Problem: Port 3306 already in use

**Solusi:**
```env
# Ubah port di XAMPP ke 3307
# Update .env file
DATABASE_URL="mysql://root:@localhost:3307/pos_db"
```

### Problem: Prisma Client error

**Solusi:**
```bash
# Regenerate Prisma Client
npx prisma generate
npx prisma db push
```

### Problem: Upload image tidak muncul

**Solusi:**
```bash
# Pastikan folder uploads exists
mkdir -p pos-be/public/uploads

# Set permissions (Linux/Mac)
chmod 755 pos-be/public/uploads
```

---

## 🤝 Kontribusi

Kontribusi selalu diterima! Silakan ikuti langkah berikut:

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

### Coding Standards

- Gunakan ESLint untuk linting
- Follow Airbnb JavaScript Style Guide
- Tulis test untuk fitur baru
- Update dokumentasi sesuai perubahan

---

## 👨‍💻 Tim Pengembang

- **Lead Developer**: Salman
- **Instructor**: BuildWithAngga Team
- **Contributors**: [List of contributors](CONTRIBUTORS.md)

---

## 📞 Support

Ada pertanyaan? Hubungi kami:

- 📧 Email: support@savoria.com
- 💬 Telegram: [@savoria_support](https://t.me/savoria_support)
- 🌐 Website: [www.buildwithangga.com](https://buildwithangga.com)

---

## 🙏 Acknowledgments

- BuildWithAngga untuk platform pembelajaran
- Community yang telah berkontribusi
- Semua user yang memberikan feedback

---

<div align="center">

**⭐ Jika proyek ini membantu, berikan star di GitHub! ⭐**

Made with ❤️ by Savoria Team

</div>
