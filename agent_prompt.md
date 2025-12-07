AIエージェントへの開発指示書

あなたは熟練したフルスタックエンジニアです。
添付の「要件定義書 (requirements.md)」および「フロントエンドプロトタイプ (App.tsx)」に基づいて、音声入力支援Webアプリケーションの新規開発を行ってください。

1. プロジェクトのゴール

Docker Compose コマンド一発で立ち上がり、ローカル環境で動作する「音声入力・要約・文書作成支援アプリ」を構築すること。

2. 提供リソース

以下のファイルを参照してください（文脈として読み込んでください）。

requirements.md: 機能要件、データ構造、API仕様の定義。

App.tsx: UI/UXの設計図。Reactコンポーネントの実装イメージ。

3. 技術スタック選定 (推奨)

要件定義書に基づき、以下のスタックを使用してください。

Infrastructure: Docker, Docker Compose

Database: PostgreSQL 15+ (pgvector拡張の導入も視野に含める)

Backend: Python 3.10+

Framework: FastAPI (非同期処理と型安全性のため)

ORM: SQLAlchemy (Async) または Prisma Client Python

Audio Processing: ffmpeg-python (m4a変換・処理用)

LLM/STT Client: OpenAI API Client (またはLangChain)

Frontend: TypeScript, React, Vite

Styling: Tailwind CSS (App.tsxで使用されているため必須)

Icons: Lucide React

State Management: React Context または Jotai/Zustand (規模に応じて判断)

Fetch: Axios または TanStack Query

4. 開発ステップの指示

以下の順序で実装計画を立て、コードを生成してください。

Step 1: 環境構築 (Infrastructure)

docker-compose.yml を作成してください。

Frontend (Node.js/Nginx), Backend (Python), Database (PostgreSQL) の3コンテナ構成。

/data ディレクトリをボリュームマウントし、永続化設定を行ってください。

リバースプロキシ対応: 将来的に前段にNginx等を置いてSSL終端を行うことを想定し、CORS設定やホスト名設定（ALLOWED_HOSTS等）を環境変数で制御できるようにしてください。

ローカル開発時はホットリロードが効くようにしてください。

Step 2: バックエンド実装 (Backend Core)

設定管理: config.yaml (System) と DB/JSON (User) の読み込みロジックを実装してください。

DB設計: sessions, transcription_blocks などのテーブル設計を行い、マイグレーションを作成してください。

API実装:

音声アップロード/保存 API (m4a形式)。

STT (Whisper) 実行 API。

LLM 実行 API（ストリーミング対応: stream=True オプションをサポートし、Server-Sent Events (SSE) 等でレスポンスを返すエンドポイントも実装してください）。

データ管理 (エクスポート/インポート/アーカイブ) API。

非同期処理設計:

音声認識やLLM処理は時間がかかるため、ユーザー体験を損なわない最適な非同期処理アーキテクチャを設計・実装してください（例: FastAPI BackgroundTasks + DBでのステータス管理 + フロントエンドからのポーリング、またはWebSocket等）。

Step 3: フロントエンド実装 (Frontend Logic)

提供された App.tsx はモックアップであるため、これをベースに機能ごとにコンポーネントを分割してください（Sidebar, TranscriptionList, Editor, SettingsModal 等）。

Backend API との通信処理を実装してください。

エディタ: Markdown表示と編集モードの切り替えを実装してください。

LLM設定: 設定画面で「ストリーミング生成を使用する」のON/OFF切り替えスイッチを実装し、OFFの場合は一括レスポンス、ONの場合は逐次表示となるよう実装してください。

Step 4: データ連携と仕上げ

音声録音機能の実装（ブラウザの MediaRecorder APIを使用し、m4aまたはwebmで録音してバックエンドへ送信）。

設定画面（APIキー設定、プロンプトテンプレート管理）の永続化。

インポート/エクスポート機能の動作確認。

5. 制約事項・遵守ルール

コードの品質: 型定義 (TypeScript/Python Type Hints) を徹底すること。

エラーハンドリング: API呼び出し失敗時や、録音エラー時のUIフィードバックを含めること。

永続化: コンテナを再起動してもデータ（DBおよびファイル）が消えない構成にすること。

セキュリティ: APIキーはフロントエンドに露出させず、必ずバックエンド経由で外部APIを叩くこと。

開始の合図:
まず、プロジェクトのディレクトリ構造案と、docker-compose.yml の初期コードを提示してください。