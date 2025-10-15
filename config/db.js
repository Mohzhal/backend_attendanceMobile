import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Konfigurasi connection pool dengan retry logic
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Timeout settings untuk Railway
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  // Tambahan untuk stability
  multipleStatements: false,
  dateStrings: true,
};

// Buat connection pool
export const db = mysql.createPool(poolConfig);

// 🔹 Test koneksi dan log status
const testConnection = async () => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      const connection = await db.getConnection();
      await connection.ping();
      console.log("✅ Database connection pool created successfully");
      console.log(`📊 Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      connection.release();
      return true;
    } catch (error) {
      retries--;
      console.error(`❌ Database connection failed (${3 - retries}/3):`, error.message);
      
      if (retries === 0) {
        console.error("💥 Failed to connect to database after 3 attempts");
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Test connection on startup
testConnection();

// 🔹 Helper function untuk execute query dengan retry logic
export const executeQuery = async (query, params = [], retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const [results] = await db.query(query, params);
      return results;
    } catch (error) {
      console.error(`❌ Query error (attempt ${attempt}/${retries}):`, error.message);
      
      // Retry hanya untuk connection errors
      if (
        (error.code === 'PROTOCOL_CONNECTION_LOST' || 
         error.code === 'ECONNRESET' ||
         error.code === 'ETIMEDOUT') && 
        attempt < retries
      ) {
        console.log(`🔄 Retrying query (attempt ${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      // Throw error jika bukan connection error atau sudah max retries
      throw error;
    }
  }
};

// 🔹 Helper function untuk transaction dengan retry
export const executeTransaction = async (callback) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// 🔹 Keep-alive ping untuk mencegah connection timeout
const keepAlive = setInterval(async () => {
  try {
    await db.query('SELECT 1');
    console.log('🏓 Database keep-alive ping successful');
  } catch (error) {
    console.error('❌ Keep-alive ping failed:', error.message);
  }
}, 30000); // Ping setiap 30 detik

// 🔹 Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('\n⏳ Closing database connections...');
  clearInterval(keepAlive);
  await db.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ Closing database connections...');
  clearInterval(keepAlive);
  await db.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

export default db;