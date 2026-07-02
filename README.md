# Intern Scout Service

## 概要

インターン生と企業をつなぐ、5日間開発のスカウトサービスプロトタイプです。
企業からのスカウトと、企業が掲載した募集へのインターン生からの応募を、
1対1のメッセージ機能へつなげます。

設計資料:

- [要件定義](docs/requirements.md)
- [ユーザーストーリー](docs/user-stories.md)
- [アーキテクチャ設計](docs/architecture.md)
- [アカウント登録・認証 詳細設計](docs/detailed-design-auth.md)
- [インターン生プロフィール 詳細設計](docs/detailed-design-intern-profile.md)
- [インターン生一覧・詳細・検索 詳細設計](docs/detailed-design-intern-search.md)
- [スカウト・会話・メッセージ 詳細設計](docs/detailed-design-conversations.md)
- [募集・応募 詳細設計](docs/detailed-design-job-postings.md)
- [アカウント削除・匿名化 詳細設計](docs/detailed-design-account-deletion.md)

## 使用技術

- フロントエンド: Next.js 16、React 19、TypeScript
- バックエンド: Rails 8.1 JSON API、Ruby 3.4
- データベース: PostgreSQL 17
- テスト: Vitest、React Testing Library、Rails標準テスト
- ローカル環境: Docker Compose
- CI: GitHub Actions
- 公開予定: Vercel、Renderの無料構成

## セットアップ

必要なもの:

- Node.js 20.9以上
- npm
- Docker Desktop

リポジトリ直下で初回セットアップを実行します。

```bash
cd /Users/yukitakahashi/Desktop/intern-scout-service
cp .env.example .env
cp frontend/.env.example frontend/.env.local
npm --prefix frontend ci
docker compose build backend
docker compose up -d db
docker compose run --rm backend bin/rails db:prepare
```

`.env` の `DEMO_USER_PASSWORD` に8文字以上のデモ用パスワードを設定し、
架空データを作成します。

```bash
docker compose run --rm backend bin/rails db:seed
```

ログイン用メールアドレスは `company@demo.example`、`startup@demo.example`、
`intern@demo.example`、`frontend-intern@demo.example`、`data-intern@demo.example` です。
パスワードは全アカウント共通で、`.env` に設定した値を使用します。

Rails APIを起動します。

```bash
docker compose up backend
```

別のターミナルでNext.jsを起動します。

```bash
npm --prefix frontend run dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

終了時:

```bash
docker compose down
```

## 環境変数

| 配置先 | 変数 | 用途 |
|---|---|---|
| `frontend/.env.local` | `BACKEND_ORIGIN` | Next.jsが接続するRails APIのorigin |
| `frontend/.env.local` | `SUPPORT_CONTACT_URL` | パスワードを忘れた場合の問い合わせ先（`https:` または `mailto:`） |
| `frontend/.env.local` | `SUPPORT_CONTACT_LABEL` | 問い合わせ先の表示名 |
| Rails実行環境 | `DATABASE_URL` | PostgreSQL接続情報 |
| Rails実行環境 | `DEMO_USER_PASSWORD` | 架空のseedアカウントに設定する共通パスワード |
| Rails実行環境 | `LOAD_DEMO_SEEDS` | `true` の場合、コンテナ起動時に架空データを再投入する |

問い合わせ先が未設定または不正な場合、ログイン画面にはリンクを作らず、デモ用の
固定案内を表示します。秘密情報は `.env` やホスティングサービスの環境変数で管理し、
Gitへ登録しません。

## 実装した機能

- [x] Next.js・Rails・PostgreSQLの初期構築
- [x] サービストップ画面
- [x] Rails APIヘルスチェック
- [x] Docker Composeによるローカル開発環境
- [x] GitHub ActionsのCI設定
- [x] インターン生のアカウント登録
- [x] 企業担当者のアカウント登録
- [x] ログイン・ログアウト・Cookieセッション管理
- [x] 利用者種別別の共通ナビゲーション・セッション切れ導線
- [ ] パスワード再設定
- [x] インターン生プロフィールの登録・編集・自動掲載
- [x] 企業向けインターン生一覧・詳細
- [x] 学校名・希望職種・技術スタックによる検索
- [x] 企業からのスカウト送信
- [x] 会話一覧・メッセージ送受信
- [x] 企業による募集の作成・編集・公開停止
- [x] インターン生による公開募集の閲覧
- [x] 募集への応募と応募メッセージの自動送信
- [x] アカウント削除・匿名化
- [x] 架空のseedデータ
- [x] Vercel・Renderへの無料デプロイ

## 設計方針

- Next.jsとRailsを分離する
  - 画面と業務処理の責務を分け、認証・認可は必ずRails API側で検証します。
- PostgreSQLの制約を利用する
  - application validationだけに依存せず、一意制約や外部キーでも不整合を防ぎます。
- 技術スタックを正規化して共通管理する
  - 大文字小文字、全角半角、余分な空白による重複を防ぎ、プロフィールと募集の検索で再利用します。
- HttpOnly Cookie sessionを採用する
  - 認証情報をブラウザJavaScriptへ露出させず、CSRF tokenと組み合わせて保護します。
- Next.jsからRails APIをreverse proxyする
  - ブラウザから見たoriginを統一し、CookieとCSRFを扱いやすくします。
- Server Componentを基本にする
  - 操作状態が必要なformだけClient Componentにし、ブラウザへ送るJavaScriptを抑えます。
- 認証切れを共通処理する
  - 保護APIの401を共通イベントへ集約し、元画面を保持したログイン導線へ戻します。
- 認証済み利用者を認証画面で詰まらせない
  - ログイン・登録画面の表示前にセッションを確認し、利用者種別に応じた画面へ自動遷移します。
- モバイルの主要操作を下部ナビへ分離する
  - 主要3導線はsafe area対応の下部固定ナビ、設定・ログアウトはヘッダーメニューへ配置します。
- 機能単位でTDDを行う
  - 詳細設計、REDテスト、最小実装、リファクタリング、全体検証の順で進めます。
- 退会時は共有履歴を保持して個人情報を匿名化する
  - 相手側の会話・応募履歴を壊さず、認証情報とプロフィールを復元できない状態にします。
- seedは再実行可能にする
  - 固定IDに依存せず架空メールアドレスをキーに更新し、繰り返し実行してもデータを重複させません。
- 無料公開環境ではPostgreSQLを1台だけ使用する
  - MVPで不要なcache・queue・realtime用DBを持たず、構成と運用を単純にします。
- パスワード再設定を実在ユーザー受け入れ前の必須条件にする
  - 未実装中は架空データだけを使い、本人確認のない手動再発行や仮パスワード共有は行いません。

## 工夫した点

- トップ画面を静的なServer Componentとして実装し、不要なClient JavaScriptを
  追加していません。
- 認証の正常系だけでなく、セッション切れ、複数入力エラー、role変更、
  不正な `return_to`、問い合わせ先未設定時のUXまで詳細設計とテストへ含めています。
- Rails APIのレスポンスに機密項目を含めず、認証失敗時もアカウントの存在を
  推測しにくい共通メッセージを使用しています。
- CSRF tokenはフォーム表示時に先読みし、同時取得を1回へまとめています。tokenが
  失効した場合も、安全に判別できるエラーに限って1回だけ再取得・再送します。
- 利用者種別を変更しても共通入力を保持し、企業名だけを企業固有の入力として扱うことで、
  入力のやり直しと誤送信の両方を防いでいます。

## テスト

| 状態 | コマンド | テスト範囲 |
|---|---|---|
| GREEN | `npm --prefix frontend run test -- src/app/page.test.tsx` | トップ画面の見出し、登録・ログイン導線 |
| GREEN | `npm --prefix frontend run test` | 全75件。認証済み画面遷移、デスクトップ・モバイルナビゲーション、ログアウト、セッション切れ、プロフィール、検索、会話、募集・応募、アカウント削除、404 |
| GREEN | Railsテストコマンドの末尾に `test/integration/api/v1/health_test.rb` を指定 | APIヘルスチェック |
| GREEN | 下記のRailsテストコマンド | 全93件。認証、プロフィール、検索、会話、募集・応募、アカウント削除・匿名化、seed、transaction、pagination、認証認可、公開制御、重複防止 |
| GREEN | Railsの `db:rollback STEP=1` 後に `db:migrate` | プロフィール関連migrationのロールバックと再適用 |
| GREEN | `docker compose run --rm backend bin/rails zeitwerk:check` | Railsの自動読み込み整合性 |
| GREEN | `docker compose run --rm backend bin/rubocop` | 80ファイル、違反なし |
| GREEN | `docker compose run --rm backend bin/brakeman --no-pager` | セキュリティ警告0件 |
| GREEN | `docker compose run --rm backend bin/bundler-audit check --update` | 依存gemの既知脆弱性なし |

フロントエンド:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build
```

バックエンド:

```bash
docker compose up -d db
docker compose run --rm \
  -e RAILS_ENV=test \
  -e DATABASE_URL=postgresql://postgres:postgres@db:5432/intern_scout_test \
  backend bin/rails db:prepare
docker compose run --rm \
  -e RAILS_ENV=test \
  -e DATABASE_URL=postgresql://postgres:postgres@db:5432/intern_scout_test \
  backend bin/rails test
docker compose run --rm backend bin/rails zeitwerk:check
docker compose run --rm backend bin/rubocop
docker compose run --rm backend bin/brakeman --no-pager
docker compose run --rm backend bin/bundler-audit check --update
```

## 今後の改善

- メールによる有効期限付き・1回限りのパスワード再設定
- メールアドレス確認
- ログイン試行回数制限とrate limit
- 主要導線のE2Eテスト
- 無料公開環境のcold startとDB有効期限への対応

### 無料デモ環境への公開

- Web: [https://intern-scout-service.vercel.app](https://intern-scout-service.vercel.app)
- API: [https://intern-scout-api.onrender.com](https://intern-scout-api.onrender.com)

1. Renderでリポジトリの `render.yaml` をBlueprintとして読み込み、
   `DEMO_USER_PASSWORD` に8文字以上の値を設定します。
2. RenderのWeb Serviceが起動したら、公開されたRails APIのoriginを確認します。
3. Vercelへ同じGitHubリポジトリを接続し、Root Directoryを `frontend` に設定します。
4. Vercelの `BACKEND_ORIGIN` にRender APIのoriginを設定してデプロイします。
5. Vercel URLから登録、ログイン、検索、応募、会話、ログアウトを確認します。

公開時は `LOAD_DEMO_SEEDS=true` により、Railsコンテナ起動時にmigrationと架空データを
再適用します。seedは再実行しても同じメールアドレスのデータを重複作成しません。
Render無料Web Serviceはアイドル時に停止するため、最初のアクセスには時間がかかります。
無料PostgreSQLは永続運用を保証する環境として扱わず、デモ前に起動とデータを確認します。
