# VoxDraft - AI Voice Drafting Tool

> [!IMPORTANT]
> **To AI Agents & Developers:**
> Before starting any development task, YOU MUST READ and FOLLOW the development guidelines defined in:
>
> 📜 **[docs/DEVELOPMENT_POLICY.md](docs/DEVELOPMENT_POLICY.md)**
>
> This policy enforces:
> 1.  Mandatory creation of reproduction scripts/tests BEFORE implementation.
> 2.  Strict verification flow.
> 3.  Referencing project context.

音声入力、自動文字起こし、AIによる文章生成を統合したドラフティングツールです。
会議の議事録作成、メールの下書き、アイデアのブレインストーミングなどを効率化します。

## 主な機能

- **音声録音 & 文字起こし**: ブラウザ上で録音し、高精度に文字起こしを行います。音声ファイルのアップロードも可能です。
- **AI文章生成 (LLM)**: 文字起こし結果を選択し、テンプレートを用いてAIに指示出しが可能です。ストリーミング生成に対応。
- **Markdownエディタ**: 生成されたテキストを編集・プレビューできるMarkdownエディタを搭載。リビジョン履歴機能付き。
- **設定の永続化**: すべての設定はサーバー側に保存され、複数デバイス間で同期されます。
- **データ管理**: セッションデータのバックアップ（エクスポート）と復元（インポート）に対応。
- **モバイル対応**: iPad/スマートフォンからのアクセスに対応したレスポンシブデザイン。

## 技術スタック

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend**: Python, FastAPI, SQLAlchemy (PostgreSQL), Alembic
- **Infrastructure**: Docker, Docker Compose

## 対応AIプロバイダー

### 音声認識 (STT)
| プロバイダー | 説明 |
|------------|------|
| **OpenAI Whisper** | OpenAI APIを使用 |
| **Azure OpenAI** | Azure OpenAI Serviceを使用 |
| **Gemini** | Google AI Studioを使用 |

### 文章生成 (LLM)
| プロバイダー | 対応モデル例 |
|------------|-------------|
| **OpenAI** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **Azure OpenAI** | Azure上にデプロイしたモデル |
| **Gemini** | gemini-2.5-flash, gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash |

## セットアップと起動方法

### 前提条件

- Docker Desktop がインストールされ、起動していること
- 使用するAIプロバイダーのAPIキーがあること

### 1. APIキーの設定

`backend/data/settings.yaml` の `general` セクションにAPIキーを設定します：

```yaml
general:
  # OpenAI を使用する場合
  openai_api_key: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  
  # Azure OpenAI を使用する場合
  azure_openai_api_key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  azure_openai_endpoint: "https://your-resource.openai.azure.com/"
  # または Azure AD トークン認証
  # azure_openai_ad_token: "xxxxxxxx"
  
  # Gemini を使用する場合
  gemini_api_key: "AIzaSxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  
  # プロバイダー設定
  stt_provider: "openai"  # "openai", "azure", "gemini"
  llm_provider: "openai"  # "openai", "azure", "gemini"
```

> [!TIP]
> **APIキーの暗号化（推奨）**
> 設定ファイルの誤アップロードに備え、APIキーを暗号化できます：
> ```bash
> docker compose exec backend python encrypt_credential.py "your-api-key"
> # 出力: ENC:xxxxxxxxxx...
> ```
> 暗号化された値を `settings.yaml` に設定すると、アプリが自動的に復号します。

### 2. プロバイダーの設定

`backend/config.yaml` でAPIプロバイダーとエンドポイントを設定します：

```yaml
system:
  stt:
    provider: "openai"  # "openai", "azure", または "gemini"
    openai_api_url: "https://api.openai.com/v1/audio/transcriptions"
    # Azure の場合
    azure_endpoint: "https://your-resource.openai.azure.com/openai/deployments/whisper/audio/transcriptions?api-version=2024-06-01"
    
  llm:
    provider: "openai"  # "openai", "azure", または "gemini"
    openai_api_url: "https://api.openai.com/v1/chat/completions"
    model: "gpt-4o"
    # Azure の場合
    azure_endpoint: "https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-06-01"
```

> [!NOTE]
> **Gemini** を使用する場合は、アプリ内の設定画面でプロバイダーとモデルを選択してください。

### 3. 起動

```bash
docker compose up --build
```

ブラウザで `https://localhost` にアクセスします。

> [!NOTE]
> 初回アクセス時に証明書警告が表示されます。自己署名証明書のため想定通りの動作です。
> 「詳細」→「このサイトにアクセスする」で続行してください。

### 他デバイスからのアクセス (HTTPS)

スマートフォンやタブレットからマイクを使用するには、HTTPSでアクセスする必要があります。

1. `docker-compose.yml` で証明書設定を更新：
   ```yaml
   nginx:
     environment:
       - CERT_HOSTS=localhost,vox-draft
       - CERT_IPS=127.0.0.1,192.168.1.100  # ホストのIPを追加
       - CERT_DAYS=365  # 証明書有効期限（日）
   ```

2. コンテナを再起動：
   ```bash
   docker compose down && docker compose up --build
   ```

3. ブラウザでアクセス：
   ```
   https://<ホストのIPアドレス>
   ```


## データ保存場所

| データ種別 | 保存場所 |
|-----------|---------|
| PostgreSQL データベース | Docker Volume (`postgres_data`) |
| 音声ファイル | `backend/data/audio/` |
| 設定ファイル (YAML) | `backend/data/settings.yaml` |
| バックアップ用アーカイブ | `backend/data/archives/` |

> [!IMPORTANT]
> `backend/data/` ディレクトリは `.gitignore` により除外されています。
> 本番環境やデータ移行時はこのディレクトリのバックアップを取ってください。

## 設定項目

アプリ内の設定画面で以下の項目を変更できます：

### 一般設定
- **言語**: 日本語 / English
- **ブロック挿入位置**: 新しい録音を上部 or 下部に追加
- **プロンプト構成**: AI呼び出し時のプロンプト構造をカスタマイズ

### APIプロバイダー設定
- **STT プロバイダー**: OpenAI / Azure / Gemini
- **LLM プロバイダー**: OpenAI / Azure / Gemini
- **Gemini モデル**: 利用可能なモデルから選択

### テンプレート
- プロンプトテンプレートの追加・編集・削除
- システム標準テンプレート (要約、箇条書き、議事録作成など)

### 単語辞書
- 読み上げ補正用の単語登録

## ディレクトリ構成

```
vox-draft/
├── frontend/          # React アプリケーション
├── backend/           # FastAPI アプリケーション
│   ├── app/           # アプリケーションコード
│   ├── data/          # データ保存ディレクトリ (Git除外)
│   ├── config.yaml    # API設定
│   └── .env           # APIキー (Git除外)
├── nginx/             # Nginxリバースプロキシ (HTTPS)
├── docs/              # 詳細ドキュメント
└── docker-compose.yml # コンテナ構成
```

## 詳細ドキュメント

- [📖 ユーザーガイド (docs/USER_GUIDE.md)](docs/USER_GUIDE.md): 詳しい機能説明
- [🛠 開発者ガイド (docs/DEVELOPMENT.md)](docs/DEVELOPMENT.md): 開発手順

## トラブルシューティング

### APIエラーが発生する
- `.env` ファイルにAPIキーが正しく設定されているか確認
- `config.yaml` でプロバイダーとエンドポイントが正しく設定されているか確認
- Dockerコンテナを再起動: `docker compose restart backend`

### モバイルからマイクが使えない
- `https://` でアクセスしているか確認（HTTPではマイクが動作しません）
- `docker-compose.yml` で `CERT_IPS` にホストのIPアドレスを追加しているか確認
- コンテナを再起動: `docker compose down && docker compose up --build`

### 証明書警告が表示される
- 自己署名証明書のため想定通りの動作です
- 「詳細」→「このサイトにアクセスする」で続行してください
- iOS: 「設定」→「一般」→「情報」→「証明書信頼設定」で証明書を信頼設定することも可能

### データベースエラー
- コンテナを完全に再構築: `docker compose down && docker compose up --build`