# バグ対応履歴 / Bug Resolution History

このファイルは、過去のバグ対応とその解決策を記録し、類似問題の再発防止と迅速な対応を目的としています。

---

## 記録フォーマット

```
### [BUG-XXX] タイトル
- **日付**: YYYY-MM-DD
- **状態**: 🔴対応中 / 🟢完了
- **報告内容**: 簡潔な問題説明
- **原因(Root Cause)**: 根本原因
- **修正内容(Fix)**: 具体的な修正
- **対象ファイル**: 変更したファイル一覧
- **検証方法**: どのように動作確認したか
- **関連**: 類似バグへのリンク (あれば)
```

---

## 完了した対応

### [BUG-001] 音声ブロックが2番目に挿入される
- **日付**: 2025-12-15
- **状態**: 🟢完了
- **報告内容**: 音声ブロック追加時、リストの2番目に挿入される（本来は末尾）
- **原因(Root Cause)**: `backend/app/api/endpoints/audio.py` で `order_index` を設定していなかった。デフォルト値 `0` が適用され、ソート順で先頭近くに配置された。
- **修正内容(Fix)**: `sessions.py` と同様に `max(order_index) + 1` を計算して設定
- **対象ファイル**: `backend/app/api/endpoints/audio.py`
- **検証方法**: スマホから音声アップロード後、ブロック順序を確認
- **関連**: テキストブロック挿入も同様の問題があった可能性（調査中）

### [BUG-002] HTTPSアクセス時にAPIが動作しない (Mixed Content)
- **日付**: 2025-12-15
- **状態**: 🟢完了
- **報告内容**: スマホからHTTPS経由でアクセス時、セッション・設定が表示されない
- **原因(Root Cause)**: `frontend/src/api/client.ts` が `http://hostname:8000` に直接アクセスしていた。HTTPS→HTTP のMixed Contentエラー。
- **修正内容(Fix)**: nginx経由 (ポート443/80) の場合は相対URL `/api/` を使用するよう修正
- **対象ファイル**: `frontend/src/api/client.ts`
- **検証方法**: スマホからHTTPS経由でセッション一覧・設定が表示されることを確認

### [BUG-003] nginx経由でWebSocket接続できない（処理中表示が出ない）
- **日付**: 2025-12-15
- **状態**: 🟢完了
- **報告内容**: HTTPS経由で再認識時「処理中」表示が見えない（localhost:5173では動作）
- **原因(Root Cause)**: 
  1. `useWebSocket.ts` がポート8000に直接接続していた
  2. `nginx.conf` に `/ws` 用の location ブロックがなかった
  3. nginx.conf がビルド時コピーでマウントされていなかった
- **修正内容(Fix)**:
  1. `useWebSocket.ts`: nginx経由時は `wss://host/ws` を使用
  2. `nginx.conf`: `/ws` location ブロック追加（backend へプロキシ）
  3. `docker-compose.yml`: nginx.conf をボリュームマウント
- **対象ファイル**: `useWebSocket.ts`, `nginx.conf`, `docker-compose.yml`
- **検証方法**: スマホから再認識ボタンで「処理中」通知を確認

### [BUG-004] 暗号化APIキーが復号されずにAPIリクエストに使用される
- **日付**: 2025-12-15
- **状態**: 🟢完了
- **報告内容**: 設定画面でAPIキーを暗号化保存後、Gemini APIリクエストで `ENC:xxx` がそのまま送信されエラー
- **原因(Root Cause)**: `get_general_settings()` が暗号化された値をそのまま返していた。サービス側で復号していなかった。
- **修正内容(Fix)**: `_decrypt_sensitive_fields()` を追加し、`get_general_settings()` で自動復号
- **対象ファイル**: `backend/app/services/settings_file.py`
- **検証方法**: Gemini APIリクエストが成功（HTTP 429 レートリミットで確認）

---

## 対応中

(なし)

---

## パターン・教訓

### order_index 未設定パターン
複数箇所でブロックを作成する場合、すべての箇所で `order_index` を正しく設定する必要がある。
- ✅ `sessions.py` create_block: 正しく設定
- ❌ `audio.py` upload: 設定漏れ → 修正済み

### Mixed Content パターン
HTTPS環境では、すべてのAPIリクエストもHTTPSで行う必要がある。
- nginx経由の場合は相対パス (`/api/`) を使用
- 開発環境 (ポート5173) では直接バックエンドにアクセス

### nginx プロキシパターン
nginx 経由でアクセスする場合、すべてのエンドポイントに location ブロックが必要。
- `/api/` → backend
- `/ws` → backend (WebSocket)
- `/` → frontend
- 設定ファイルはボリュームマウントで再起動のみで反映可能に
