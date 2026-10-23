
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

// 型をインポートする
import type {
    RowDataPacket,
    ResultSetHeader,
} from 'mysql2/promise';

// .envファイルを読み込む
dotenv.config();

// 本番環境かどうか
const isProduction = process.env.NODE_ENV === 'production';

// 本番環境で必要な環境変数を確認する
if (isProduction) {
    const requiredVariables = [
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
        'DB_SSL_CA_PATH',
    ];

    const missingVariables = requiredVariables.filter(
        (name) => !process.env[name]
    );

    if (missingVariables.length > 0) {
        throw new Error(
            `必要なDB環境変数が設定されていません: ${missingVariables.join(', ')}`
        );
    }
}

// SSLのCA証明書を読み込む
const sslCaPath = process.env.DB_SSL_CA_PATH;

const ssl = sslCaPath
    ? {
        ca: readFileSync(sslCaPath, 'utf8'),
        rejectUnauthorized: true,
    }
    : undefined;

// DB接続設定
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',

    // DB_NAMEが設定されている場合だけ指定する
    ...(process.env.DB_NAME
        ? { database: process.env.DB_NAME }
        : {}),

    // SSL設定がある場合だけ指定する
    ...(ssl ? { ssl } : {}),

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

// DB接続プールを作成する
const pool = mysql.createPool(dbConfig);

// DB接続プールを破棄する関数
export async function closePool() {
    try {
        await pool.end();
        console.log('データベース接続プールを破棄しました。');
    } catch (err) {
        console.error(
            'データベース接続プールの破棄中にエラーが発生しました：',
            err
        );
    }
}

// SQL文を実行する関数（SELECT）
export async function query<T = any>(
    sql: string,
    params: any[] = []
) {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            sql,
            params
        );

        return rows as T[];
    } catch (err) {
        console.error(
            'SQLの実行中にエラーが発生しました：',
            err
        );
        throw err;
    }
}

// SQL文を実行する関数（INSERT、UPDATE、DELETE）
export async function exec(
    sql: string,
    params: any[] = []
) {
    try {
        const [result] = await pool.execute<ResultSetHeader>(
            sql,
            params
        );

        return result;
    } catch (err) {
        console.error(
            'SQLの実行中にエラーが発生しました：',
            err
        );
        throw err;
    }
}
