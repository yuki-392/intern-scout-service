# インターン生プロフィール 詳細設計

## 1. 対象

本書は、US-02「プロフィール登録・編集」とUS-13「アクセス制御」を実装するための
詳細設計を定める。企業向け一覧・詳細・検索は次の実装単位とし、本書では検索に
利用できるデータ構造と公開条件までを扱う。

## 2. 設計方針

- インターン生登録直後はプロフィール行を作成せず、未掲載状態とする。
- 最初の有効な保存時にプロフィールを作成し、必須項目が揃った時点で自動掲載する。
- 不正な更新では既存プロフィールを変更せず、検出した入力エラーを一括返却する。
- プロフィールと技術スタックの更新は一つのDB transactionで行う。
- 技術スタックは正規化した共通マスタとして保持し、表記揺れと重複を防ぐ。
- 閲覧・更新権限はRails APIで検証し、画面の非表示だけに依存しない。
- 実名、住所、電話番号など、MVPに不要な個人情報は収集しない。

## 3. 入力仕様

| 項目 | 必須 | 形式・上限 | 補足 |
|---|---|---|---|
| 表示名 | 必須 | 1〜50文字 | 前後の空白を除去。実名である必要はない |
| 学校名 | 必須 | 1〜100文字 | 前後の空白を除去 |
| 学年 | 必須 | 選択式 | 下記の許可値だけを受け入れる |
| 自己紹介 | 必須 | 1〜1,000文字 | 前後の空白を除去し、本文中の改行は保持 |
| 希望職種 | 任意 | 最大100文字 | 空文字は `null` として保存 |
| 技術スタック | 任意 | 1件1〜50文字、最大20件 | 空要素と正規化後の重複を拒否 |

学年の許可値は、`1年`、`2年`、`3年`、`4年`、`5年`、`修士1年`、`修士2年`、
`博士課程`、`その他` とする。

文字数はUnicodeの文字数として数える。フロントエンドにも `maxLength` と文字数表示を
設けるが、Rails validationを正とする。

## 4. データ設計

### 4.1 intern_profiles

| カラム | 型 | NULL | 制約・用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| user_id | bigint | false | intern roleのUser |
| display_name | string | false | 表示名、最大50文字 |
| school_name | string | false | 学校名、最大100文字 |
| grade | string | false | 許可した学年 |
| bio | text | false | 自己紹介、最大1,000文字 |
| desired_role | string | true | 希望職種、最大100文字 |
| published_at | datetime | false | 企業向け掲載開始日時 |
| created_at | datetime | false | 作成日時 |
| updated_at | datetime | false | 更新日時 |

DB制約:

- `user_id` に外部キーと一意indexを設定し、Userと1対1にする。
- `grade` に許可値のcheck constraintを設定する。
- User物理削除時はcascade deleteする。

application validation:

- 表示名、学校名、自己紹介、学年を必須とする。
- 各テキスト項目へ3章の文字数上限を適用する。
- Userのroleが `intern` であることを検証する。
- `published_at` は最初の有効な保存時に設定し、通常の編集では変更しない。

### 4.2 technical_stacks

| カラム | 型 | NULL | 制約・用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| name | string | false | 表示用名称、最大50文字 |
| normalized_name | string | false | 重複判定・検索用名称 |
| created_at | datetime | false | 作成日時 |
| updated_at | datetime | false | 更新日時 |

正規化は、前後空白の除去、Unicode NFKC正規化、連続空白の統合、小文字化の順で行う。
`normalized_name` に一意indexを設定し、`Ruby`、` ruby `、`Ｒｕｂｙ` を同一として扱う。
既存マスタがある場合はその表示名を再利用する。

### 4.3 intern_profile_technical_stacks

| カラム | 型 | NULL | 制約・用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| intern_profile_id | bigint | false | プロフィール |
| technical_stack_id | bigint | false | 技術スタック |
| position | integer | false | 入力順、0〜19 |
| created_at | datetime | false | 作成日時 |
| updated_at | datetime | false | 更新日時 |

DB制約:

- `(intern_profile_id, technical_stack_id)` に一意indexを設定する。
- `(intern_profile_id, position)` に一意indexを設定する。
- `position BETWEEN 0 AND 19` のcheck constraintを設定する。
- 両外部キーにcascade deleteを設定する。

## 5. 掲載条件

- アカウント登録直後はInternProfileが存在せず、企業向け一覧へ掲載しない。
- 必須項目を含むプロフィールが初めて正常保存された時刻を `published_at` へ設定する。
- `published_at` があるプロフィールだけを企業向け一覧・詳細の対象とする。
- 必須項目を空にする更新は422とし、以前のプロフィールと掲載状態を維持する。
- 技術スタックと希望職種は任意であり、空でも掲載できる。

明示的な下書き・公開停止はMVPに含めない。入力途中の値は画面内で保持し、有効な保存が
完了するまでDBへ書き込まない。

## 6. API設計

### 6.1 `GET /api/v1/me/intern_profile`

- 認証: 必須、internのみ
- status: 200
- 未作成: `{ "data": null }`
- 未認証: 401
- company role: 403 `role_not_allowed`
- `Cache-Control: no-store`

未作成は初回編集画面の正常な状態なので、404ではなく `data: null` を返す。

### 6.2 `PATCH /api/v1/me/intern_profile`

request:

```json
{
  "intern_profile": {
    "display_name": "たかし",
    "school_name": "Example大学",
    "grade": "3年",
    "bio": "Web開発を学んでいます。",
    "desired_role": "バックエンドエンジニア",
    "technical_stacks": ["Ruby", "Rails"]
  }
}
```

処理:

1. 認証済みUserがinternであることを検証する。
2. プロフィール項目と技術スタック全件をvalidationする。
3. transaction内でプロフィールを作成または更新する。
4. 技術スタックを検索または作成し、関連を入力順で置換する。
5. 初回保存時だけ `published_at` を設定する。
6. 明示的にserializeしたプロフィールを返す。

成功response:

```json
{
  "data": {
    "id": 1,
    "display_name": "たかし",
    "school_name": "Example大学",
    "grade": "3年",
    "bio": "Web開発を学んでいます。",
    "desired_role": "バックエンドエンジニア",
    "technical_stacks": ["Ruby", "Rails"],
    "published": true,
    "published_at": "2026-06-30T12:00:00Z"
  }
}
```

statusは成功200、未認証401、company role 403、validationまたはCSRFエラー422とする。
入力エラーは認証APIと同じ `errors` 配列で全件返す。技術スタック全体のfieldは
`technical_stacks`、特定要素は `technical_stacks.2` のように0始まりのindexを付ける。

同じ技術スタックの同時作成による一意制約違反は捕捉し、既存行を再取得する。
プロフィール本体だけが更新される中間状態を残さない。

## 7. Rails構成

```text
backend/
├── app/controllers/api/v1/me/intern_profiles_controller.rb
├── app/models/intern_profile.rb
├── app/models/technical_stack.rb
├── app/models/intern_profile_technical_stack.rb
├── app/serializers/intern_profile_serializer.rb
├── app/services/intern_profiles/upsert.rb
└── db/migrate/
    ├── *_create_intern_profiles.rb
    ├── *_create_technical_stacks.rb
    └── *_create_intern_profile_technical_stacks.rb
```

- Controllerは認証、認可、parameter、responseへ集中する。
- profileと関連の一括更新は `InternProfiles::Upsert` に分離する。
- serializerはemail、user_idなど企業表示に不要な項目を返さない。
- company向け一覧・詳細は後続の別controllerで実装し、自分用APIを流用しない。

## 8. Next.js構成

```text
frontend/src/
├── app/profile/edit/page.tsx
└── features/intern-profile/
    ├── intern-profile-form.tsx
    ├── technical-stack-input.tsx
    ├── intern-profile-api.ts
    └── intern-profile-types.ts
```

- pageはServer Component、入力・取得・保存状態を持つformはClient Componentとする。
- 初回表示時にプロフィール取得とCSRF token先読みを並行して開始する。
- 取得中はloading、未作成時は空フォーム、失敗時は再試行導線を表示する。
- 学年は未選択optionを持つselectとする。
- 自己紹介には現在文字数と1,000文字の上限を表示する。
- 技術スタックはbuttonまたはEnterで追加し、入力順で表示して個別削除できるようにする。
- 20件到達時と重複時は追加せず、その場で理由を表示する。
- 保存中は二重送信を防ぎ、成功時は「プロフィールを保存しました」と表示する。
- 複数エラーを概要と各fieldへ表示し、概要へfocusを移す。
- 401ではloginへ移動し、403ではrole別の既定画面へ戻す。

通信失敗後も入力値を保持する。MVPではlocalStorageへ永続化せず、ページを離れるまでの
React stateだけで保持する。

## 9. エラー・個人情報方針

- 表示名、学校名、自己紹介、希望職種を通常ログへ残さない。
- validation failureは想定内としてerror logにしない。
- responseへemail、user_id、deleted_atなどを含めない。
- 他人のUser IDを受け付けるparameterやrouteを用意しない。
- 将来の企業向けAPIでも、要件にない連絡先や認証情報は返さない。

## 10. テスト設計

コード生成前に次の失敗するテストを追加する。

### 10.1 Rails model / DB

- 有効なintern Userと必須項目で保存でき、company Userでは保存できない。
- 各文字数の境界値、必須項目、不正な学年を検証する。
- UserはInternProfileを1件だけ持てる。
- grade check constraint、外部キー、一意indexが存在する。
- TechnicalStackをNFKC・空白・小文字で正規化し、正規化後の名称を一意にする。
- profileとstackの重複関連、20を超えるpositionをDBで拒否する。

### 10.2 Rails request / service

- 未作成時のGETが200と `data: null` を返す。
- 初回PATCHでプロフィールとstackを作成し、自動掲載する。
- 2回目のPATCHは同じプロフィールを更新し、`published_at` を維持する。
- stackを入力順で置換し、20件は保存でき、21件を422にする。
- 正規化後の重複、空要素、50文字超を422にする。
- 複数fieldのエラーを一度に返す。
- 不正更新時に既存プロフィールと関連を変更しない。
- 未認証を401、company roleを403、CSRF tokenなしのPATCHを422にする。
- responseへemail、user_idなどを含めない。

### 10.3 Next.js

- loading、未作成、取得失敗の各状態を表示する。
- 全入力にlabelがあり、学年の選択肢を表示する。
- 既存プロフィールと自己紹介の文字数を表示する。
- stackを追加・削除でき、重複と21件目を画面上で拒否する。
- 複数エラーをfieldと概要へ表示し、概要へfocusを移す。
- 保存中の二重送信を防ぎ、成功を通知する。
- 通信失敗時に入力値を失わず再送できる。
- 401でloginへ遷移し、安全な `return_to=/profile/edit` を設定する。

## 11. 対象外

- プロフィール画像、ファイル、SNS・ポートフォリオなどの外部リンク
- 住所、電話番号、生年月日、性別などの個人情報
- 下書き保存、手動の公開・非公開切替
- 技術スタック候補検索と運営用マスタ管理
- 企業向け一覧・詳細・検索

## 12. 完了条件

- migrationのup/downと、model、service、request、frontend testが成功する。
- 必須プロフィール保存後に `published_at` が設定される。
- 不正更新で既存データと掲載状態が変わらない。
- intern以外が自分用プロフィールAPIを利用できない。
- 技術スタックは最大20件で、正規化後の重複を保存できない。
- lint、型チェック、production build、Zeitwerk checkが成功する。
- API responseとログへ要件外の個人情報を露出しない。
