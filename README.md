# VoxDraft - AI Voice Drafting Tool

音声入力、自動文字起こし、AIによる文章生成を統合したドラフティングツールです。
会議の議事録作成、メールの下書き、アイデアのブレインストーミングなどを効率化します。

## 主な機能

- **音声録音 & 文字起こし**: ブラウザ上で録音し、OpenAI Whisper APIを用いて高精度に文字起こしを行います。音声ファイルのアップロードも可能です。
- **AI文章生成 (LLM)**: 文字起こし結果を選択し、テンプレート（要約、整形、メール作成など）を用いてAIに指示出しが可能です。ストリーミング生成に対応。
- **Markdownエディタ**: 生成されたテキストを編集・プレビューできるMarkdownエディタを搭載。
- **設定の永続化**: APIキーやプロンプトテンプレート、単語辞書はブラウザに保存され、再読み込み後も維持されます。
- **データ管理**: セッションデータのバックアップ（エクスポート）と復元（インポート）に対応。

## 技術スタック

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend**: Python, FastAPI, SQLAlchemy (PostgreSQL), Alembic
- **Infrastructure**: Docker, Docker Compose

## セットアップと起動方法

### 前提条件

- Docker Desktop がインストールされ、起動していること。
- OpenAI API Key があること（設定画面で入力、または `backend/config.yaml` に記述）。

### 起動手順

1. リポジトリのルートディレクトリで以下のコマンドを実行します。

```bash
docker compose up --build
```

2. 初回起動時はデータベースのマイグレーションが自動的に行われますが、もしエラーが出る場合は手動で適用してください（通常は起動スクリプトに含まれています）。

3. ブラウザで `http://localhost:5173` にアクセスします。

### 開発用コマンド

- フロントエンドのみ再ビルド: `npm run build` (frontendディレクトリ)
- バックエンドのみ再ビルド: `docker compose build backend`

## 詳細ドキュメント

より詳細な情報は `docs/` ディレクトリ内のドキュメントを参照してください。

- [📖 ユーザーガイド (docs/USER_GUIDE.md)](docs/USER_GUIDE.md): 詳しい機能説明、画面操作方法、データ管理について。
- [🛠 開発者ガイド (docs/DEVELOPMENT.md)](docs/DEVELOPMENT.md): 画面レイアウトの修正手順、ビルド方法、ディレクトリ構成について。

## ディレクトリ構成

- `frontend/`: Reactアプリケーション
- `backend/`: FastAPIアプリケーション
- `docs/`: 詳細ドキュメント
- `docker-compose.yml`: コンテナ構成定義

## 注意事項 (データ管理)

- **データ保存場所**: 音声データやデータベースは `backend/data` ディレクトリに保存されます。
- **Git除外**: `backend/data` やビルド生成物は `.gitignore` によりリポジトリから除外されています。