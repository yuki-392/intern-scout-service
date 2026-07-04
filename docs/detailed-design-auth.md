# アカウント登録・認証 詳細設計

## 1. 対象

本書は、次のユーザーストーリーを実装するための詳細設計を定める。

- US-01 インターン生のアカウント登録
- US-05 企業担当者のアカウント登録
- US-10 ログイン・ログアウト
- US-13 認証済み利用者の識別

プロフィール、検索、会話、募集、応募、退会処理は対象外とする。退会予定のUserを
後から匿名化できるよう、`deleted_at`だけはこの段階で用意する。

## 2. 設計方針

- Rails APIを認証と認可の正とする。
- パスワード認証にはRailsの `has_secure_password` を用いる。
- 認証状態はRailsの暗号化Cookie sessionへ `user_id` と `session_version` を保存する。
- CookieはブラウザJavaScriptから読み取れないHttpOnlyとする。
- Next.jsの `/api/*` rewriteを通し、ブラウザからは同一オリジンで通信する。
- 状態変更APIではCSRF tokenを必須にする。
- 登録成功後は自動ログインし、利用者種別に応じた次画面へ移動する。
- 認証失敗時は、メールアドレスの登録有無を推測できる情報を返さない。
- 5日間の公開デモでは `DEMO_MODE` により架空アカウントだけを登録可能にする。
- password再設定tokenは30分・一回限りとし、成功時に既存sessionを失効する。

## 3. データ設計

### 3.1 users

| カラム | 型 | NULL | 制約・用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| email | string | false | trim・小文字化して保存、最大254文字 |
| password_digest | string | false | password hash |
| role | string | false | `intern` または `company` |
| deleted_at | datetime | true | 退会日時。値があるUserは認証不可 |
| session_version | integer | false | Cookieのサーバー側一括失効に使う世代番号 |
| reset_password_digest | string | true | 再設定tokenのSHA-256 digest |
| reset_password_sent_at | datetime | true | 再設定token発行日時 |
| created_at | datetime | false | 作成日時 |
| updated_at | datetime | false | 更新日時 |

DB制約:

- `email` に一意indexを設定する。
- `role IN ('intern', 'company')` のcheck constraintを設定する。
- emailは保存前に前後空白を除き、小文字化するため、通常の一意indexで
  大文字小文字を区別しない重複を防ぐ。

model validation:

- email: 必須、最大254文字、一般的なメール形式
- password: 登録時必須、8文字以上、UTF-8で72bytes以下
- password_confirmation: passwordと一致
- role: `intern` または `company`
- deleted_atがあるUserはlogin対象外

パスワードには文字種の強制を設けない。長さを確保し、パスワードマネージャーが
生成した値やpassphraseを妨げないためである。

### 3.2 companies

| カラム | 型 | NULL | 制約・用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| user_id | bigint | false | company roleのUser |
| name | string | false | 企業名、最大100文字 |
| created_at | datetime | false | 作成日時 |
| updated_at | datetime | false | 更新日時 |

DB制約:

- `user_id` に外部キーと一意indexを設定し、1企業1担当者とする。
- `user_id` の削除時はCompanyも削除する。退会機能ではUserを物理削除しないため、
  実際の匿名化処理は退会機能の詳細設計で定める。

application validation:

- name: 必須、前後空白を除去、最大100文字
- Userのroleが `company` であること

### 3.3 関連

- intern UserはCompanyを持たない。
- company UserはCompanyを必ず1件持つ。
- company登録ではUserとCompanyを一つのDB transactionで作成する。
- どちらかのvalidationが失敗した場合、両方とも保存しない。

## 4. session・Cookie・CSRF

### 4.1 session

- session store: Rails CookieStore
- Cookie名: `_intern_scout_session`
- 保存値: `user_id`、`session_version`
- HttpOnly: true
- SameSite: Lax
- Secure: productionのみtrue
- 有効期間: 7日
- login、登録成功、logout時に `reset_session` を実行し、session fixationを防ぐ。
- logout、password再設定、退会時は `session_version` を更新し、複製済みCookieも失効する。

### 4.2 login試行制限

- IPアドレスはHMAC-SHA256 digestだけを保存し、生値を保持しない。
- 15分以内に5回失敗すると、同じIPからのloginを15分間拒否する。
- 成功時は失敗記録を削除する。制限時は429と `Retry-After` を返す。

各認証済みリクエストでUserを取得し、存在しない場合または `deleted_at` がある場合は
sessionを破棄して401を返す。

### 4.3 session失効時のUX

- 認証済み画面のAPIが401を返した場合、API clientはlogin画面へ移動する。
- login画面へ `reason=session_expired` と安全なアプリ内 `return_to` を渡し、
  「セッションの有効期限が切れました。もう一度ログインしてください」と表示する。
- `return_to` は現在のoriginを基準にURLとして解析し、同一originかつlogin後のroleに
  許可されたpathだけを受け入れる。
- 許可pathは共通の `/conversations`、`/settings/account`、internの `/profile/edit`、
  `/jobs`、companyの `/interns`、`/company/jobs` とする。配下のpathとqueryは許可する。
- 外部URL、`//` で始まるprotocol-relative URL、backslash、制御文字、未知のpath、
  `/login`、`/signup` は拒否する。
- login成功後は `return_to` があれば元の画面へ戻す。
- 不正またはroleに許可されない `return_to` は無視し、internは `/jobs`、companyは
  `/interns` へ移動する。
- 初回訪問など、以前の認証状態を確認できない401は通常の未ログインとして扱う。
- passwordなどの機密入力は保存しない。募集編集などの下書き保持は、各機能の
  詳細設計で扱う。

### 4.4 CSRF

1. 登録・login formを表示した時点で `GET /api/v1/auth/csrf` を先読みする。
2. APIはsession CookieとCSRF tokenを返す。
3. フロントエンドはtokenを `X-CSRF-Token` headerへ設定する。
4. Railsは登録、login、logoutを含むすべての状態変更でtokenを検証する。
5. 登録・login・logoutでsessionを再生成した後、フロントエンドは保持していたtokenを
   破棄する。次の状態変更時に新しいtokenを取得する。

token取得中に送信された場合は、表示時に開始した同じPromiseの完了を待つ。送信操作で
新たな取得を重複させない。tokenが失効していた場合は新しいtokenを取得し直し、
本処理が未実行であることを確認できるCSRFエラーに限って1回だけ再送する。

CSRF token不正時は、共通エラー形式で422を返す。

## 5. API設計

### 5.1 共通レスポンス

成功:

```json
{
  "data": {
    "id": 1,
    "email": "intern@example.com",
    "role": "intern",
    "company": null
  }
}
```

企業担当者の場合、`company` は `{ "id": 1, "name": "Example Inc." }` とする。
password、password_digest、session値、deleted_atは返さない。

入力エラー:

```json
{
  "errors": [
    {
      "code": "validation_error",
      "field": "email",
      "message": "メールアドレスはすでに使用されています"
    },
    {
      "code": "validation_error",
      "field": "password",
      "message": "パスワードは8文字以上で入力してください"
    }
  ]
}
```

validation時は、検出できた全fieldのエラーを一つの `errors` 配列で返す。同じfieldに
複数エラーがある場合も省略しない。フロントエンドは一度の応答ですべて表示する。

認証エラー:

```json
{
  "errors": [
    {
      "code": "invalid_credentials",
      "message": "メールアドレスまたはパスワードが正しくありません"
    }
  ]
}
```

### 5.2 `GET /api/v1/auth/csrf`

- 認証: 不要
- status: 200
- response: `{ "data": { "csrf_token": "..." } }`
- Cache-Control: `no-store`

### 5.3 `POST /api/v1/auth/registrations`

request（intern）:

```json
{
  "user": {
    "role": "intern",
    "email": "intern@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }
}
```

request（company）:

```json
{
  "user": {
    "role": "company",
    "email": "company@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "company_name": "Example Inc."
  }
}
```

処理:

1. 許可したparameterだけを取得する。
2. roleに応じてUser、必要ならCompanyをtransaction内で作成する。
3. sessionを再生成して `user_id` と `session_version` を保存する。
4. Userの公開可能な自分向け情報を返す。

status:

- 201: 登録・自動login成功
- 409: すでにlogin済み
- 422: validationまたはCSRFエラー

### 5.4 `POST /api/v1/auth/session`

request:

```json
{
  "session": {
    "email": "intern@example.com",
    "password": "password123"
  }
}
```

処理:

1. emailをtrim・小文字化してUserを検索する。
2. `deleted_at` がなく、passwordが一致する場合だけ成功とする。
3. sessionを再生成して `user_id` と `session_version` を保存する。

status:

- 200: login成功
- 401: email不明、password不一致、退会済みのいずれか
- 409: すでにlogin済み
- 422: requestまたはCSRFエラー

401のmessageはすべて同じにする。

### 5.5 `DELETE /api/v1/auth/session`

- 認証: 必須
- 処理: sessionを再生成して認証状態を破棄する。
- status: 204
- 未認証時: 401

### 5.6 `GET /api/v1/me`

- 認証: 必須
- status: 200
- response: 共通成功レスポンス
- 未認証または退会済み: 401
- Cache-Control: `no-store`

### 5.7 `POST /api/v1/auth/password_reset`

- 認証: 不要
- request: `{ "email": "intern@example.com" }`
- active userが存在する場合だけ、30分有効な一回限りのreset linkをメール送信する。
- 登録有無にかかわらず同じ202 responseを返す。
- 同一IPから15分に5回を超えた場合は429と `Retry-After` を返す。

### 5.8 `PATCH /api/v1/auth/password_reset`

- 認証: 不要
- request: `token`、`password`、`password_confirmation`
- tokenのdigestと期限を検証し、password変更後にtokenを削除する。
- 成功時は `session_version` を更新して既存sessionを失効し、204を返す。
- token不正、期限切れ、validation errorは422を返す。

## 6. Rails構成

想定する主なファイル:

```text
backend/
├── app/controllers/api/v1/auth/
│   ├── csrf_controller.rb
│   ├── password_resets_controller.rb
│   ├── registrations_controller.rb
│   └── sessions_controller.rb
├── app/controllers/api/v1/me_controller.rb
├── app/controllers/concerns/authentication.rb
├── app/models/user.rb
├── app/models/login_throttle.rb
├── app/models/company.rb
├── app/serializers/current_user_serializer.rb  # または同等の明示的変換
└── db/migrate/
    ├── *_create_users.rb
    └── *_create_companies.rb
```

- `ApplicationController` でCookie、session、CSRF保護を有効にする。
- `Authentication` concernで `current_user`、`authenticate_user!`、
  `already_authenticated?` を提供する。
- ControllerはHTTP処理に集中させる。
- JSONへ渡す項目は明示し、model全体をそのままrenderしない。
- 例外処理で `ActiveRecord::RecordNotUnique` を422相当へ変換し、同時登録でも
  DB例外をそのまま返さない。

## 7. Next.js構成

想定する主なファイル:

```text
frontend/src/
├── app/signup/page.tsx
├── app/login/page.tsx
├── features/auth/
│   ├── signup-form.tsx
│   ├── login-form.tsx
│   ├── role-selector.tsx
│   ├── auth-api.ts
│   └── auth-types.ts
└── lib/api-client.ts
```

- pageはServer Componentを基本とする。
- 入力状態、送信、エラー表示、画面遷移を持つformだけClient Componentにする。
- `/signup` はrole選択を表示する。
- `/signup?role=intern` はemail、password、password確認を表示する。
- `/signup?role=company` は上記に企業名を追加する。
- 未知のrole queryはrole選択へ戻す。
- form上部に現在の利用者種別と「利用者種別を変更」を常時表示する。
- 利用者種別を変更してrole選択へ戻っても、同じページを離れるまではemail、password、
  password確認をメモリ上で保持する。企業名はcompanyを再選択した場合だけ復元する。
- emailとpasswordは両roleに共通するため常に保持する。企業名はcompany固有stateとして
  保持し、intern選択中は非表示かつrequestから除外する。入力のやり直しを防ぎながら、
  無関係な企業名をintern登録へ送らないためである。
- 送信中は二重送信を防ぎ、buttonをdisabledにする。
- label、入力単位の複数エラー、`role="alert"` のエラー概要を同時表示する。
- validation応答後はエラー概要へfocusを移し、一度の送信で全エラーを確認できるようにする。
- frontend validationは操作支援に限り、Railsのvalidationを正とする。

login画面には、共通の認証失敗messageに加えて次の救済導線を表示する。

- 「アカウントをお持ちでない方」の新規登録リンク
- 「パスワードを忘れた方」へのMVP運用案内
- session失効時だけ表示する再login案内

登録・login成功後の遷移:

| role | 登録後 | login後 |
|---|---|---|
| intern | `/profile/edit` | `/jobs` |
| company | `/interns` | `/interns` |

登録後のinternはプロフィール未完成のため、必ず `/profile/edit` へ移動する。

## 8. エラー・ログ方針

- password、password_confirmation、Cookie、CSRF tokenをログへ出さない。
- Railsのfilter parameterへ上記項目を追加する。
- emailを認証失敗ログへ平文で残さない。
- 想定内のvalidation failureはerror logにしない。
- 予期しないエラーはrequest IDとともに記録し、利用者には共通messageを返す。
- フロントエンドは通信失敗時に再試行可能なmessageを表示する。
- 401の共通messageでは登録有無を開示せず、UI上の登録・運用案内で次の行動を示す。

## 9. テスト設計

コード生成前に次の失敗するテストを追加する。

### 9.1 Rails model / DB

- Userは有効なintern情報で保存できる。
- emailをtrim・小文字化する。
- 大文字小文字だけが異なる重複emailを拒否する。
- 不正role、短いpassword、72bytes超passwordを拒否する。
- Companyはcompany Userにだけ作成できる。
- Company名の空・100文字超を拒否する。
- DBの一意制約とrole check constraintが存在する。

### 9.2 Rails request

- intern登録が201となり、Companyを作らず自動loginする。
- company登録が201となり、UserとCompanyを作成する。
- company名なし、重複email、不一致password確認を422とする。
- 複数fieldが不正な場合、検出した全エラーを一度に返す。
- 不正roleからUserを作成しない。
- 正しい情報でloginし、`GET /me` が利用者を返す。
- email不明、password不一致、退会済みは同じ401 responseを返す。
- logout後は `GET /me` が401になる。
- 未認証logoutを401にする。
- CSRF tokenなし・不正tokenの状態変更を拒否する。
- form表示時にCSRF取得を開始し、送信時に取得を重複させない。
- password_digestなどの機密fieldをresponseへ含めない。

### 9.3 Next.js

- role選択にinternとcompanyの導線がある。
- intern formに必要な入力とlabelがある。
- company formだけ企業名を表示する。
- role選択へ戻って再選択しても入力内容を保持する。
- 複数の入力エラーをfieldとエラー概要へ同時表示し、概要へfocusを移す。
- 送信中の二重送信を防ぐ。
- 登録成功後にrole別の画面へ移動する。
- login失敗時に登録有無を推測させない共通messageを表示する。
- login画面に新規登録とpassword忘れ時の案内を表示する。
- 認証済み操作中の401ではsession失効messageを表示し、安全な元画面へ戻せる。
- 正常なアプリ内 `return_to` を使用し、外部URL、protocol-relative URL、未知のpath、
  login/signupへの `return_to` は無視してrole別のデフォルト画面へ戻す。
- support連絡先が設定済みなら安全なリンクを表示し、未設定または不正なschemeなら
  linkなしのデモ用固定案内を表示する。
- login成功後にrole別の画面へ移動する。

## 10. password再設定

- `POST /api/v1/auth/password_reset` は登録有無にかかわらず同じ202を返す。
- 同一IPからの受付は15分に5回までとし、超過時は429を返す。
- active userに32bytesの乱数tokenを発行し、DBにはSHA-256 digestだけを保存する。
- 登録メールアドレスへ `FRONTEND_ORIGIN/reset-password#token=...` を送り、access logへtokenを残さない。
- tokenは30分・1回限りとし、成功後はdigestと発行日時を削除する。
- password変更成功時は `session_version` を更新し、既存sessionをすべて失効する。
- 配信jobにはUser IDだけを渡し、job内でtokenを生成して平文tokenをjob引数やログへ残さない。
- 公開デモでは `DEMO_MODE=true` とし、`.example` で終わる架空メールだけ登録できる。

## 11. 対象外

- メールアドレス確認
- OAuth / SNS login
- 多要素認証
- CAPTCHA
- 「login状態を保持する」の選択
- 管理者によるUser管理

対象外項目は、MVP後に必要性と脅威モデルを確認して追加する。

## 12. 完了条件

- migrationのupとdownを確認できる。
- model、request、frontend testが成功する。
- lint、型check、production build、Zeitwerk checkが成功する。
- CookieへHttpOnly、SameSite、production Secureが設定される。
- CSRFなしで状態変更できない。
- API responseとログへ認証情報を露出しない。
- session失効、複数入力エラー、role変更、login失敗時の救済導線をテストできる。
- password再設定tokenの期限、一回性、既存session失効をテストできる。
- login試行制限とデモ用メール制限をテストできる。
- READMEとAPI設計が実装結果と一致する。
