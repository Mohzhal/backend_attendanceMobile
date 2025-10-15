# ✅ Deployment Checklist - Backend Attendance

## 📦 Perubahan yang Dilakukan

### 1. **Database Configuration (config/db.js)**
- ✅ Menambahkan connection timeout settings untuk Railway
- ✅ Implementasi retry logic untuk connection errors
- ✅ Keep-alive mechanism untuk mencegah connection timeout
- ✅ Graceful shutdown handling
- ✅ Export `executeQuery` helper function

### 2. **Main Server (index.js)**
- ✅ Improved CORS configuration
- ✅ Health check endpoint (`/health`)
- ✅ Request logging middleware
- ✅ Better error handling (specific error types)
- ✅ Graceful shutdown implementation
- ✅ Unhandled rejection & uncaught exception handlers

### 3. **All Controllers - Menggunakan `executeQuery`**
- ✅ `authController.js` - Login & register dengan retry
- ✅ `attendanceController.js` - Semua query attendance
- ✅ `companyController.js` - CRUD companies
- ✅ `hrController.js` - HR verification & applicants
- ✅ `uploadController.js` - File upload handling
- ✅ `userController.js` - User management

### 4. **Error Handling Improvements**
- ✅ Consistent error messages
- ✅ Development vs Production error details
- ✅ Connection error retry logic
- ✅ Proper HTTP status codes

---

## 🚀 Langkah Deployment

### Step 1: Update Files di Project
```bash
# 1. Update file-file berikut di project kamu:
# - config/db.js
# - index.js
# - controller/authController.js
# - controller/attendanceController.js
# - controller/companyController.js
# - controller/hrController.js
# - controller/uploadController.js
# - controller/userController.js

# 2. Update package.json (jika belum)
npm install
```

### Step 2: Test di Local (Optional)
```bash
# Set environment variables local
cp .env.example .env
# Edit .env dengan data local

# Test run
npm start

# Test health check
curl http://localhost:3000/health
```

### Step 3: Push ke Railway
```bash
git add .
git commit -m "Fix: Implement retry logic and improve error handling"
git push origin main
```

### Step 4: Verify Environment Variables di Railway

**Backend Service Variables:**
```env
HOST=0.0.0.0
PORT=3000
DB_HOST=nozomi.proxy.rlwy.net
DB_PORT=10206
DB_USER=root
DB_PASS=oEdhoyDHhBXqKzOkPnvyXvhOqDGgGAFJ
DB_NAME=railway
JWT_SECRET=supersecretkey123
NODE_ENV=production
```

### Step 5: Monitor Deployment Logs

Tunggu deployment selesai di Railway Dashboard, lalu cek logs:

**Expected Logs:**
```
✅ Database connection pool created successfully
📊 Connected to: nozomi.proxy.rlwy.net:10206/railway
📁 Static files served from: /app/uploads
==================================================
🚀 Server running on 0.0.0.0:3000
📡 API: http://localhost:3000
📁 Uploads: http://localhost:3000/uploads
🏥 Health: http://localhost:3000/health
🌍 Environment: production
==================================================
```

---

## 🧪 Testing Endpoints

### 1. Health Check
```bash
curl https://backendattendancemobile-production.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-15T05:24:00.000Z",
  "database": "connected",
  "uptime": 123.45,
  "environment": "production"
}
```

### 2. Test Login
```bash
curl -X POST https://backendattendancemobile-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "nik": "your_nik",
    "password": "your_password"
  }'
```

### 3. Test Get Companies
```bash
curl https://backendattendancemobile-production.up.railway.app/api/companies
```

---

## 🐛 Troubleshooting

### Error: "Connection lost"
**Penyebab:** Database connection timeout atau terputus

**Solusi:**
1. ✅ Sudah dihandle dengan retry logic (3x retry)
2. ✅ Keep-alive ping setiap 30 detik
3. Tunggu beberapa detik, sistem akan auto-reconnect

### Error: "Request timeout"
**Penyebab:** Request terlalu lama

**Solusi:**
1. Cek Railway MySQL service status
2. Restart Railway service jika perlu
3. Check database query performance

### Error: "ECONNABORTED"
**Penyebab:** Frontend request dibatalkan sebelum selesai

**Solusi di Frontend:**
```javascript
// Tambahkan retry di frontend
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config.retry) config.retry = 0;
    
    if (error.code === 'ECONNABORTED' && config.retry < 3) {
      config.retry += 1;
      await new Promise(r => setTimeout(r, 1000 * config.retry));
      return api(config);
    }
    
    return Promise.reject(error);
  }
);
```

---

## 📊 Monitoring

### Check Logs di Railway
1. Buka Railway Dashboard
2. Pilih **backend_attendanceMobile** service
3. Tab **Deployments** → Latest deployment
4. Tab **Logs**

### Things to Monitor:
- ✅ Database connection success messages
- ✅ Keep-alive ping logs (setiap 30 detik)
- ⚠️ Error messages (jika ada)
- ⚠️ Retry attempts (jika ada connection issues)

### Expected Keep-Alive Logs:
```
🏓 Database keep-alive ping successful
```

---

## 🎯 Success Criteria

### ✅ Backend berfungsi dengan baik jika:
1. Health check endpoint return status `ok`
2. Login/register berhasil tanpa error
3. Tidak ada "Connection lost" error di logs
4. Keep-alive ping berjalan normal
5. Semua CRUD operations berfungsi

### ⚠️ Perlu investigasi jika:
1. Health check return status `error`
2. Frequent retry attempts di logs
3. Keep-alive ping gagal
4. Request timeout > 30 detik

---

## 📝 Notes

### Perubahan Breaking Changes:
**TIDAK ADA** - Semua perubahan backward compatible

### Migration Required:
**TIDAK** - Tidak ada perubahan database schema

### Environment Variables Baru:
- `NODE_ENV=production` (Optional, untuk control error messages)

---

## 🔄 Rollback Plan

Jika ada masalah setelah deployment:

```bash
# Revert ke commit sebelumnya
git revert HEAD
git push origin main

# Atau rollback di Railway Dashboard
# Deployments → Previous deployment → Redeploy
```

---

## 📞 Support

Jika masih ada error setelah deployment:

1. Check Railway logs untuk error details
2. Test dengan curl commands di atas
3. Verify environment variables
4. Check database connectivity dari Railway shell

**Common Issues & Solutions documented above** ⬆️