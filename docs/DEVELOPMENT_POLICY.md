# 開発基本方針 / Basic Development Policy

> [!TIP]
> **To Developers & AI Agents:**
> This document is a **Living Document**.
> It is intended to be updated and customized to fit the specific needs, technology stack, and workflow of **this specific project**.
> As the project evolves, please update this policy to reflect the current best practices and context.
> 他のプロジェクトでこのファイルを流用する場合も、そのプロジェクトの文脈に合わせて内容を書き換えてから使用してください。

このドキュメントは、本プロジェクト（vox-draft）の開発における基本方針とワークフローを定義するものです。
開発作業を開始する前に、必ずこのドキュメントを確認してください。

## 1. 開発プロセス / Development Workflow

全てのタスクは以下のフローに従って進行します：

1.  **ガイドライン確認 (Check Policy)**
    *   作業開始時に必ずこの `docs/DEVELOPMENT_POLICY.md` を読み返してください。
2.  **要件理解 & 計画 (Plan)**
    *   ユーザーの要望を理解し、`task.md` を更新してタスクを細分化してください。
    *   複雑な変更の場合は `implementation_plan.md` を作成してください。
3.  **実装 (Implement)**
    *   コードを実装・修正します。
4.  **テスト実行 & 検証 (Verify)**
    *   作成したテスト (`tests/run_tests.py` / `npx playwright test`) を実行し、PASSすることを確認してください。
    *   詳しくは「2. テスト作成 & メンテナンス」を参照。
5.  **ドキュメント更新 (Update Docs)**
    *   `task.md` の完了チェック。
    *   `walkthrough.md` への記録（必要に応じて）。
    *   `config.sample.yaml` の更新確認。

## 2. テスト作成 & メンテナンス (Create/Maintain Tests)
**「テストコードもプロダクトコードの一部である」**
- **網羅性:** 正常系 (Happy Path) だけでなく、異常系 (Error Cases) も必ずテストする。
- **全レイヤー:** 
    - **バックエンド:** `tests/run_tests.py` を用いた統合テスト（APIレベル）を必ず実装・通過させる。
    - **フロントエンド:** `npx playwright test` を用いたUI/E2Eテストを行い、画面の表示崩れや動作不良がないか検証する。
- **常時メンテナンス:** 機能を追加・変更した場合は、**必ず** 対応するテストコードを追加・修正する。
  - テストが失敗する状態でコミットしてはならない。
  - 既存のテストが古くならないように、仕様変更時はテストも同時に更新する（コードとテストの同期）。

## 3. ドキュメント & 設定ファイルの完全同期 (Sync Docs & Configs)
**「コード、テスト、ドキュメント、設定サンプルは一蓮托生」**
いかなる機能変更においても、以下の4点セットが整合している状態を保つこと。
1.  **コード (Source Code)**
2.  **テスト (Tests)**: backend/tests, frontend/tests
3.  **ドキュメント (Docs)**: README.md, DEVELOPMENT_POLICY.md 等
4.  **設定サンプル (Config Samples)**: 
    - `backend/config.yaml` の構造が変わった場合は、必ず **`backend/config.sample.yaml`** も更新すること。
    - ユーザーが参照する設定マニュアル等も同時に更新すること。

**成果物の定義:** コードが動くだけでは完了ではない。「テストが通り、ドキュメントと設定サンプルが最新であること」をもって完了とする。

## 4. ロギング & デバッグ (Logging & Debugging)
- **デバッグモード (Debug Mode)**: 
    - UI設定（SettingsModal）からON/OFFを切り替えることができます。
    - トラブルシューティング時のみ有効にし、普段はOFFにすることを推奨します。
    - 有効時はバックエンドのログ出力が詳細になります。
- **機密情報の秘匿 (Secret Redaction)**: 
    - ログには **絶対に** APIキーやトークンなどの認証情報を生で出力してはいけません。
    - 専用の `log_safe` ユーティリティやフィルタを使用してマスクしてください。
- **トラブルシュート (Troubleshooting)**: 
    - 接続エラー等はデバッグモードのログを確認して原因を特定してください。
    - エラーメッセージには、ユーザーが行動可能な情報（例：「URL形式が不正です」）を含めてください。

## 5. プロジェクト概要・文脈 / Project Context

### アーキテクチャ構成
*   **Backend**: FastAPI (Python), PostgreSQL, SQLAlchemy. Dockerコンテナ `backend` で稼働。
*   **Frontend**: React (Vite), TailwindCSS. Dockerコンテナ `frontend` で稼働。
*   **設定管理**:
    *   `config.yaml` / `settings.yaml`: 初期設定および静的な設定。
    *   DB (`settings` table): 動的な設定（ユーザー変更可能）。
    *   API (`/api/settings`): 設定の取得・更新。

### これまでの主要な実装 (Past Milestones)
*   **YAMLベースの設定管理**: `SettingsFileService` による YAML 読み込みと DB 保存のハイブリッド構成。
*   **Prompt/Template管理**: 詳細なシステムプロンプト設定、ユーザー定義テンプレートのCRUD。
*   **接続テスト機能**: `SettingsModal` から STT/LLM の接続テストを実行する機能（厳格なエラーハンドリング実装済み）。
*   **Session管理**: 録音データ、テキストデータのセッション管理、ゴミ箱機能（Soft Delete）。
*   **Gemini 対応**: Google Gemini API の統合（STT/LLM）。

## 6. 注意事項 / Notes
*   **ユーザーへの報告**: 修正完了時は「何が原因で」「どう修正し」「どうやって確認したか（テスト結果）」を明確に報告してください。
*   **エラーハンドリング**: ユーザーに「成功（False Positive）」を見せないよう、例外処理とステータスコードの扱いに注意してください。

## 7. バグ履歴管理 / Bug History Tracking

**「同じ過ちを繰り返さない」**

バグ対応時は、`docs/BUG_HISTORY.md` に以下を記録する:

1.  **対応開始時**:
    - 問題の概要と報告内容を記載
    - 状態を `🔴対応中` に設定

2.  **対応完了時**:
    - 根本原因 (Root Cause) を明確に記載
    - 修正内容と対象ファイルを記載
    - 検証方法を記載
    - 状態を `🟢完了` に更新

3.  **新規タスク開始時**:
    - `BUG_HISTORY.md` を確認し、類似パターンがないかチェック
    - 過去の教訓を活かした実装を心がける

> [!TIP]
> バグ履歴に「パターン・教訓」セクションがあります。繰り返し発生しやすい問題パターンを追記し、ナレッジを蓄積してください。
