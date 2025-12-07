# 開発者ガイド (Development Guide)

VoxDraft の開発、ビルド、修正手順についてのドキュメントです。

## 開発環境のセットアップ

### 必要要件

- Docker Desktop
- Node.js (ローカルでのフロントエンド開発時)
- Python 3.10+ (ローカルでのバックエンド開発時)

### ディレクトリ構造

```
vox-draft/
├── backend/            # FastAPI アプリケーション
│   ├── app/            # アプリケーションコード
│   ├── data/           # データ保存用 (Dockerマウント)
│   ├── config.yaml     # 設定ファイル
│   └── Dockerfile
├── frontend/           # React アプリケーション (Vite)
│   ├── src/            # ソースコード
│   └── Dockerfile
├── docs/               # ドキュメント
├── docker-compose.yml  # コンテナ構成
└── README.md
```

## ビルドと起動

### 全体起動

ルートディレクトリで以下を実行します。

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API Doc: `http://localhost:8000/docs`

### フロントエンドの変更と更新

UIのレイアウト修正など、フロントエンドのみを変更した場合:

1. `frontend/src/` 内のファイルを編集します。
2. 以下のコマンドでフロントエンドのみを再ビルド・再起動できます。
   ```bash
   # Dockerを使用している場合
   docker compose up -d --build --no-deps frontend
   ```
3. 開発中は、ローカルで `npm run dev` を実行するとホットリロードが効き、高速に開発できます。
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   ※ この場合、`vite.config.ts` のプロキシ設定が `http://localhost:8000` に向いていることを確認してください。

### バックエンドの変更と更新

APIのロジック修正など、バックエンドを変更した場合:

1. `backend/app/` 内のファイルを編集します。
2. 以下のコマンドでバックエンドのみを再ビルド・再起動できます。
   ```bash
   docker compose up -d --build --no-deps backend
   ```

### データベースのマイグレーション

モデル (`backend/app/models/`) を変更した場合、Alembicを使ってDBスキーマを更新します。

```bash
# コンテナ内で実行
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```

## データ管理仕様

- **永続化**: 音声ファイルとSQLiteデータベースは `backend/data/` に保存されます。このディレクトリはDockerボリュームとしてマウントされています。
- **一時ファイル**: ビルド生成物 (`dist/`, `__pycache__/`) や一時的なアップロードファイルは `.gitignore` で除外されています。
