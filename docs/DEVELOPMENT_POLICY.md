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
3.  **テスト作成 (Create Tests)**
    *   **【重要】** 実装前に、期待する動作を検証するためのテストコードを作成してください。
    *   バグ修正の場合：バグを再現するスクリプト（Pythonスクリプトやcurlコマンド等）を作成し、失敗することを確認してください。
    *   新機能の場合：機能が正しく動作することを確認する検証スクリプトを作成してください。
4.  **実装 (Implement)**
    *   コードを実装・修正します。
5.  **テスト実行 & 検証 (Verify)**
    *   作成したテストを実行し、成功することを確認してください。
    *   UIの変更については、スクリーンショットやブラウザ操作で確認してください。
6.  **ドキュメント更新 (Update Docs)**
    *   `task.md` の完了チェック。
    *   `walkthrough.md` への記録（必要に応じて）。

## 2. テスト指針 / Testing Guidelines

*   **バックエンド (Backend)**
    *   これまでは手動確認がメインでしたが、今後は `requests` 等を用いた Python スクリプトを作成し、自動的に検証可能な状態にすることを原則とします。
    *   例: `/api/settings/test` の挙動確認のために `test_connection.py` を作成する。
*   **フロントエンド (Frontend)**
    *   ロジック修正（例: ステータス判定）の場合は、極力単体テスト的な視点で確認を行ってください（現在はJest等のセットアップが不完全なため、ブラウザでの動作確認＋ログ確認を徹底）。

## 3. プロジェクト概要・文脈 / Project Context

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

## 4. 注意事項 / Notes
*   **ユーザーへの報告**: 修正完了時は「何が原因で」「どう修正し」「どうやって確認したか（テスト結果）」を明確に報告してください。
*   **エラーハンドリング**: ユーザーに「成功（False Positive）」を見せないよう、例外処理とステータスコードの扱いに注意してください。
