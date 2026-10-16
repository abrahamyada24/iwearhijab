> Panduan KasirPOS: [deployment](../PANDUAN_DEPLOYMENT.md) dan [penggunaan](../PANDUAN_PENGGUNA.md).

# 🍽️ Savoria POS — Enterprise Point of Sale System

Savoria POS adalah **sistem kasir modern berbasis Web** yang dirancang khusus untuk operasional **restoran, kafe, dan bistro**. Proyek ini mengedepankan perpaduan **Clean & Luxury UI**, **manajemen stok real-time**, **integrasi pembayaran digital (QRIS)**, serta **keamanan tingkat enterprise** melalui verifikasi **OTP (One-Time Password)**.

Dokumentasi ini disusun untuk membantu Anda menjalankan proyek **secara lokal (Student-Friendly Setup)** dengan konfigurasi yang jelas, rapi, dan mudah diikuti.

---

## 🚀 Tech Stack (Local Environment)

### Frontend — POS Dashboard

* **Framework:** Next.js 16+ (App Router)
* **State Management:** Zustand (Persistence Middleware)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Animations:** Tailwind Animate & Framer Motion Logic

### Backend — API Server

* **Runtime:** Node.js & Express.js
* **ORM:** Prisma
* **Database:** MySQL (Local / XAMPP)
* **Security:** JWT (JSON Web Token) & OTP Verification
* **Payment:** Midtrans Snap API (Sandbox Mode)
* **Email Service:** Nodemailer (Gmail SMTP)
* **Storage:** Local Disk Storage (penyimpanan foto di server lokal)

---

## 📂 Project Structure

Proyek ini terdiri dari **dua folder utama** yang berjalan **secara mandiri**:

### 1️⃣ Backend — `pos-be`

```
pos-be/
├── prisma/             # Schema & model database (MySQL)
├── public/
│   └── uploads/        # Penyimpanan foto lokal (WAJIB ADA)
├── src/
│   ├── config/         # Konfigurasi Swagger & database
│   ├── controllers/    # Business logic (Auth, Transaksi, Produk, dll)
│   ├── middlewares/    # AuthGuard & upload handler
│   ├── routes/         # Endpoint API
│   ├── utils/          # Helpers (Email Service, Invoice Generator)
│   └── app.js          # Entry point Express server
├── .env                # Environment variables backend
└── package.json
```

### 2️⃣ Frontend — `pos-dashboard`

```
pos-dashboard/
├── public/             # Asset statis & logo
├── src/
│   ├── app/            # Next.js App Router (Auth, Admin, POS)
│   ├── components/     # UI components (Sidebar, Modal, Filter, dll)
│   ├── store/          # Zustand store (Cart & Auth persistence)
│   └── utils/          # Formatter, SweetAlert & helpers
├── .env.local          # Environment variables frontend
└── package.json
```

---

## 🛠 Requirements (Persiapan)

Pastikan perangkat Anda telah memenuhi kebutuhan berikut:

* **Node.js** ≥ 20.x
* **MySQL / XAMPP** (MySQL Service harus *Running*)
* **Gmail App Password** (untuk pengiriman OTP via email)

---

## ⚙️ Setup & Instalasi (Step-by-Step)

### LANGKAH 1 — Persiapan Database Lokal (WAJIB)

> Prisma **tidak membuat database MySQL secara otomatis**.

1. Buka **phpMyAdmin** → `http://localhost/phpmyadmin`
2. Klik **New / Baru**
3. Buat database dengan nama:

   ```
   pos_db
   ```
4. Klik **Create**

---

### LANGKAH 2 — Setup Backend (`pos-be`)

1. Masuk ke folder backend:

   ```bash
   cd pos-be
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Buat file `.env` di root folder `pos-be`:

   ```env
   PORT=5000
   DATABASE_URL="mysql://root:@localhost:3306/pos_db"
   JWT_SECRET="savoria_secret_2026"

   # MIDTRANS CONFIG (SANDBOX)
   MIDTRANS_SERVER_KEY="Mid-server-xxx"
   MIDTRANS_CLIENT_KEY="Mid-client-xxx"
   MIDTRANS_IS_PRODUCTION=false

   # EMAIL OTP CONFIG (GMAIL)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER="email_anda@gmail.com"
   SMTP_PASS="16_digit_app_password_gmail"
   ```

4. Sinkronisasi database dengan Prisma:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Pastikan folder upload tersedia:

   ```
   pos-be/public/uploads
   ```

   (Jika belum ada, buat secara manual)

6. Jalankan backend server:

   ```bash
   npm run dev
   ```

---

### LANGKAH 3 — Setup Frontend (`pos-dashboard`)

1. Buka terminal baru, masuk ke folder frontend:

   ```bash
   cd pos-dashboard
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Buat file `.env.local`:

   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5000"
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="Mid-client-xxx"
   ```

4. Jalankan frontend:

   ```bash
   npm run dev
   ```

5. Akses aplikasi melalui browser:

   ```
   http://localhost:3000
   ```

---

## 🖼️ Mekanisme Penyimpanan Foto Lokal

Pada versi pembelajaran ini, **foto produk disimpan langsung di harddisk lokal**:

* **Upload:** File diunggah melalui dashboard dan diproses menggunakan `multer`
* **Storage:** File disimpan di folder `pos-be/public/uploads`
* **Database:** Database hanya menyimpan **nama file** (contoh: `image-1712345.jpg`)
* **Serving:** Backend mengekspos folder uploads sebagai static public folder

Contoh akses gambar:

```
http://localhost:5000/uploads/namafile.jpg
```

---

## 🔑 Fitur Utama (Highlight)

* **Secure OTP Login** — Autentikasi berlapis dengan kode OTP 6 digit via email
* **Bento Grid UI** — Tampilan kasir futuristik, cepat & intuitif
* **Atomic Transactions** — Konsistensi stok terjaga meskipun terjadi error
* **Snapshot Pricing** — Riwayat transaksi aman dari perubahan harga di masa depan
* **Local-First Learning** — Bisa dipelajari & dikembangkan tanpa biaya hosting

---

## 👨‍💻 Kontribusi & Support

Project ini dikembangkan sebagai **Premium Portfolio Project** di platform **BuildWithAngga (BWA)**.

Jika mengalami kendala setup database, silakan merujuk ke:

```
documentation_database.md
```

**Contact:**

* 📧 Email: [zirmanvictory@gmail.com](mailto:zirmanvictory@gmail.com)
* 🌐 Platform: BuildWithAngga

---

© 2026 **Savoria POS System**
Premium Source Code by **Salman**
