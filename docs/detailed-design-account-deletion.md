# アカウント削除・匿名化 詳細設計

## 1. 対象

本書はUS-12「アカウント削除」とUS-13「アクセス制御」を実装するための詳細設計を定める。
共有済みMessageとApplicationの参照整合性を保ちながら、認証情報と個人プロフィールを
復元不能にし、以後の操作を禁止する。

## 2. 設計方針

- User行は物理削除せず、`deleted_at` と匿名値を持つ退会済みrecordとして残す。
- 削除確定時に現在のpasswordを再入力させ、CSRFだけでなく本人の再確認も行う。
- 認証情報、プロフィール、企業情報、募集状態を一つのDB transactionで更新する。
- Conversation、Message、Applicationは共有履歴として保持する。
- 表示時は保存済みの元情報ではなく `deleted_at` を優先し、「退会済みユーザー」と表示する。
- 退会処理成功後にsessionを破棄し、同じCookieで操作を継続できないようにする。
- 一度確定した退会はMVPでは復元しない。

## 3. 匿名化仕様

### User

- `email`: `deleted-{user_id}-{random}@deleted.invalid` へ置換する。
- `password_digest`: 生成した十分に長いrandom passwordのhashへ置換する。
- `deleted_at`: transaction内の現在時刻を設定する。
- `role`: 履歴のparticipant判定に必要なため保持する。

random値を使うことで、一度退会したemailを将来別Userが登録でき、匿名emailの衝突も防ぐ。
元emailや置換用passwordを退会logへ残さない。

### intern

- InternProfileを物理削除する。
- profileとTechnicalStackの中間recordはcascade deleteする。
- Applicationは保持する。
- 参加Conversationと送信Messageは保持する。

### company

- Company行はJobPostingと履歴の参照先として保持する。
- Company.nameを `退会済み企業-{company_id}` へ置換する。
- 全JobPostingを `draft` へ変更し、公開一覧から即時除外する。
- JobPosting、Application、Conversation、Messageは保持する。

Company名の元値は保持しない。既存会話では相手を一律「退会済みユーザー」と表示するため、
匿名化後のCompany名を利用者へ表示しない。

## 4. API設計

### `DELETE /api/v1/me/account`

- 認証: 必須
- CSRF: 必須
- request: `{ "account": { "password": "current password" } }`
- 成功: 204
- 未認証・退会済み: 401
- password不一致: 422 `invalid_password`
- transaction失敗: 500共通error。部分的な匿名化を残さない。

処理:

1. current Userをrow lock付きで再取得する。
2. passwordを検証する。
3. role別のプロフィール・企業・募集処理を行う。
4. email、password_digestを匿名値へ置換し、`deleted_at` を設定する。
5. transaction commit後に `reset_session` を行う。
6. bodyなしの204を返す。

password不一致でも入力値やhashをresponse・logへ含めない。退会済みUserはAuthentication concernで
認証対象外になるため、以後の `GET /me`、応募、返信、掲載をすべて拒否できる。

## 5. 既存機能への影響

- 認証: `deleted_at` があるUserのloginを既存の共通401で拒否する。
- インターン生検索: profile削除とactive User条件により一覧・詳細から消える。
- 公開募集: company退会時に全件draftとなり一覧・詳細から消える。
- 会話一覧・詳細: counterpartの `deleted_at` を確認し「退会済みユーザー」と表示する。
- Message送信: Conversationのいずれかが退会済みなら `conversation_closed` を返す。
- 応募: current User認証と公開募集条件により拒否する。
- 既存ApplicationとMessage: 引き続き参照できるが、退会者の個人情報は表示しない。

## 6. Rails構成

```text
app/controllers/api/v1/me/accounts_controller.rb
app/services/accounts/delete.rb
```

- `Accounts::Delete` がrow lockとrole別transactionを担当する。
- Controllerは認証、Strong Parameters、password確認、session破棄、HTTP statusを担当する。
- anonymous emailとpasswordは `SecureRandom` で生成する。
- Message本文など共有履歴を誤って削除しないよう、削除対象を明示する。

## 7. Next.js構成

```text
app/settings/account/page.tsx
features/account/account-deletion-form.tsx
features/account/account-api.ts
```

確認画面には次を明示する。

- ログインできなくなり、元に戻せない。
- internプロフィール、または企業情報が匿名化される。
- 企業の公開募集はすべて非公開になる。
- 送信済みMessageは相手側へ「退会済みユーザー」として残る。
- 応募履歴と会話履歴は共有履歴として残る。

password入力と「上記を理解しました」checkboxの両方が揃うまで確定buttonを無効化する。
送信中は二重送信を防ぎ、password不一致はfield付近へ表示する。成功後はトップへ移動し、
「アカウントを削除しました」と表示する。通信失敗時はpassword以外の確認状態を保持するが、
passwordをlocalStorageなどへ保存しない。

## 8. セキュリティ・ログ

- password、元email、匿名化用random値をlogへ残さない。
- requestのpasswordは既存filter parameterで除外する。
- User IDをrequestで受け取らず、current Userだけを対象にする。
- transaction commit前にsessionを破棄しない。
- 退会後の認証Cookieを再利用できないことをrequest testで確認する。
- password不一致を試行できるため、将来rate limit対象へ含める。

## 9. テスト設計

コード生成前に次のREDテストを追加する。

### Rails

- 正しいpasswordでinternを退会でき、profileと関連だけが削除される。
- company退会でCompany名が匿名化され、全募集がdraftになる。
- emailとpassword_digestが復元不能な値へ置換される。
- Conversation、Message、Application、JobPostingは保持される。
- 退会後のsession、login、返信、応募、一覧掲載を拒否する。
- password不一致、CSRFなし、未認証を拒否し、何も変更しない。
- transaction途中の失敗で全変更をrollbackする。
- response・logにpassword、元email、匿名化値を含めない。

### Next.js

- 削除影響と共有履歴保持を表示する。
- checkboxとpasswordが揃うまで確定できない。
- 二重送信を防ぐ。
- password不一致を表示する。
- 成功後にトップへ遷移し、完了messageを表示する。
- 通信失敗時に再試行でき、passwordを永続化しない。

## 10. 対象外

- 退会取消・復元
- 管理者による強制削除
- データexport
- 法令・契約に基づく保存期間管理

## 11. 完了条件

- 認証情報と個人プロフィールが復元不能になる。
- shared履歴の参照整合性を維持する。
- 企業募集が公開一覧から即時に消える。
- 退会後のloginと新規操作がすべて拒否される。
- rollback、認可、CSRF、password確認をテストできる。
- Rails・frontend test、lint、型チェック、build、Zeitwerk、セキュリティ検査が成功する。
