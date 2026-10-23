
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { closePool } from './db';
import todoRoutes from './routes/todo';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import { verifyToken } from './jwt';
import type { Request, Response } from 'express';

// .envファイルを読み込む
dotenv.config();

// 環境変数からポート番号を取得する
const port = Number(process.env.PORT) || 3000;

// Webサーバーの土台を作成する
const app = express();

// CORSの許可オリジンを設定する
const frontUrl =
    process.env.FRONT_URL || 'http://localhost:5173';

app.use(
    cors({
        origin: frontUrl,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    })
);

// JSON形式のリクエストボディを解析する
app.use(express.json());

// クッキーを解析する
app.use(cookieParser());

// ToDoのCRUD機能を担当するルート
app.use('/api/todos', verifyToken, todoRoutes);

// 認証機能を担当するルート
app.use('/api/auth', authRoutes);

// 本番環境ではReactのビルド済みファイルを配信する
if (process.env.NODE_ENV === 'production') {
    // backend/dist/app.js から frontend/dist を参照する
    const staticDir = path.resolve(
        __dirname,
        '../../frontend/dist'
    );

    // CSS、JavaScript、画像などの静的ファイルを配信する
    app.use(express.static(staticDir));

    // Reactの画面遷移に対応する
    // Express 5のルート記法を使用する
    app.get('/{*splat}', (req, res, next) => {
        // 未定義のAPIへのアクセスは404処理に渡す
        if (req.path === '/api' || req.path.startsWith('/api/')) {
            return next();
        }

        // Reactアプリのエントリーポイントを返す
        res.sendFile(path.join(staticDir, 'index.html'));
    });
}

// 定義したルート以外へのアクセスに対する処理
app.use((req: Request, res: Response) => {
    res
        .status(404)
        .set('Content-Type', 'text/html; charset=utf-8');

    res.send('<h1>ページが見つかりませんでした。</h1>');
});

// アプリ終了時にDB接続プールを安全に破棄する
const shutdownSignals: NodeJS.Signals[] = [
    'SIGINT',
    'SIGTERM',
    'SIGHUP',
];

shutdownSignals.forEach((signal) => {
    process.on(signal, async () => {
        console.log(
            `\n${signal}を受信。アプリケーションの終了処理中...`
        );

        try {
            await closePool();
        } catch (err) {
            console.error('DB接続プールの終了に失敗しました:', err);
        } finally {
            process.exit(0);
        }
    });
});

// Webサーバーを起動する
app.listen(port, '0.0.0.0', () => {
    console.log(`Webサーバーがポート${port}で起動しました。`);
});
