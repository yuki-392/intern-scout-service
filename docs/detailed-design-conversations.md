# スカウト・会話・メッセージ 詳細設計

## 1. 対象

本書はUS-08「スカウト送信」、US-11「会話一覧・返信」、US-13「アクセス制御」を
実装するための詳細設計を定める。募集への応募を起点とする会話再利用と自動メッセージは、
同じデータモデルを利用するが、処理自体は募集・応募の実装単位で扱う。

## 2. 設計方針

- 企業担当者とインターン生の組み合わせにつきConversationを1件だけ保持する。
- 企業からの初回スカウトは、会話作成または再利用とMessage作成を一つのtransactionで行う。
- 会話開始はcompanyだけ、返信は会話参加者だけに許可する。
- 権限外と存在しない会話は同じ404を返し、会話の存在を推測しにくくする。
- メッセージ本文は1〜2,000文字とし、前後空白を除去して空になる本文を拒否する。
- 未読管理、通知、リアルタイム更新はMVP対象外とし、画面再読み込みで最新状態を取得する。
- 会話とMessageはUserへ関連付け、将来プロフィールを削除しても履歴を維持できるようにする。

## 3. データ設計

### 3.1 conversations

| カラム | 型 | NULL | 制約・用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| company_user_id | bigint | false | company roleの参加者 |
| intern_user_id | bigint | false | intern roleの参加者 |
| last_messaged_at | datetime | false | 一覧の並び順 |
| created_at | datetime | false | 作成日時 |
| updated_at | datetime | false | 更新日時 |

DB制約:

- `(company_user_id, intern_user_id)` に一意indexを設定する。
- 両participantへusers外部キーを設定し、User物理削除時はrestrictする。
- `company_user_id <> intern_user_id` のcheck constraintを設定する。
- `last_messaged_at DESC, id DESC` の複合indexを設定する。

application validationでは各Userのroleと退会状態を検証する。同時リクエストで会話作成が
競合した場合は、一意制約違反後に既存Conversationを再取得する。

### 3.2 messages

| カラム | 型 | NULL | 制約・用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| conversation_id | bigint | false | 所属会話 |
| sender_id | bigint | false | 送信User |
| body | text | false | 1〜2,000文字 |
| kind | string | false | `scout`、`normal`、`application` |
| created_at | datetime | false | 送信日時 |
| updated_at | datetime | false | 更新日時 |

DB制約:

- conversationとsenderへ外部キーを設定する。
- `kind IN ('scout', 'normal', 'application')` のcheck constraintを設定する。
- `(conversation_id, created_at, id)` に履歴取得用indexを設定する。

application validationでは、senderがConversation参加者であること、本文の前後空白除去後が
1〜2,000文字であることを検証する。Message作成後にConversationの `last_messaged_at` を
送信日時へ更新する。

## 4. 表示仕様

### 相手表示

- companyから見た相手: InternProfileの表示名
- internから見た相手: Company名
- 相手が退会済み: `退会済みユーザー`

相手が退会済みでも既存履歴は表示するが、新規送信は拒否する。プロフィール未作成のinternは
企業からスカウトできないため、通常の会話では必ず表示名を取得できる。

### メッセージ種別

- `scout`: 企業がインターン生詳細から送る最初または追加のスカウト
- `normal`: 会話詳細から双方が送る通常返信
- `application`: 応募処理が作る定型メッセージ

種別は表示上の補助に使うが、本文と送信者は常に表示する。

## 5. API設計

### 5.1 `POST /api/v1/conversations`

- 認証: 必須、companyのみ
- request: `{ "conversation": { "intern_profile_id": 1, "body": "..." } }`
- 成功: 201
- 未認証: 401、intern role: 403
- 未掲載・退会済み・不存在profile: 404
- 本文不正・CSRF不正: 422

処理:

1. 掲載済みかつactiveなInternProfileを取得する。
2. participantの組み合わせでConversationを取得または作成する。
3. companyをsender、`scout`をkindとしてMessageを作成する。
4. `last_messaged_at` を更新する。
5. Conversation IDと作成Messageを返す。

会話を再利用した場合も新しいMessageを作成するため、responseは201で統一する。

### 5.2 `GET /api/v1/conversations`

- 認証: 必須
- 自分がparticipantの会話だけを返す。
- 1ページ20件、`last_messaged_at DESC, id DESC`。
- query: `page`。不正値は422。
- response: `data` と `current_page`、`total_pages`、`total_count`、`per_page`。

各要素はConversation ID、相手表示名、最新Messageの200文字概要、最新種別、送信者、
更新日時を返す。Messageと相手情報をpreloadし、N+1 queryを避ける。

### 5.3 `GET /api/v1/conversations/:id`

- 認証: 必須、participantのみ
- 非participant・不存在: 404 `not_found`
- query: `page`。1ページ50Message。
- page 1は最新50件、page 2以降はそれ以前を取得する。
- 各page内は `created_at ASC, id ASC` で返し、画面では古い順に読めるようにする。

responseはConversation ID、相手、送信可否、Message配列、pagination metaを返す。
相手が退会済みの場合は `can_send: false` とする。

### 5.4 `POST /api/v1/conversations/:id/messages`

- 認証: 必須、participantのみ
- request: `{ "message": { "body": "..." } }`
- kind: server側で `normal` 固定
- 成功: 201
- 非participant・不存在: 404
- いずれかのparticipantが退会済み: 422 `conversation_closed`
- 本文・CSRF不正: 422

sender_idやkindをrequestから受け取らず、current Userとserver側の固定値から設定する。

## 6. Rails構成

```text
backend/
├── app/controllers/api/v1/conversations_controller.rb
├── app/controllers/api/v1/messages_controller.rb
├── app/models/conversation.rb
├── app/models/message.rb
├── app/services/conversations/start_scout.rb
└── app/serializers/
    ├── conversation_list_serializer.rb
    └── conversation_detail_serializer.rb
```

- `Conversations::StartScout` が会話取得・作成とMessage作成のtransactionを担当する。
- Controllerは認証、認可、parameter、statusへ集中する。
- 一覧は最新Message、Company、InternProfileをpreloadする。
- Message本文をparameter filterへ追加し、通常ログへ残さない。
- serializerはemail、participant User ID、削除前の個人情報を返さない。

## 7. Next.js構成

```text
frontend/src/
├── app/conversations/page.tsx
├── app/conversations/[id]/page.tsx
└── features/conversations/
    ├── scout-form.tsx
    ├── conversation-list.tsx
    ├── conversation-detail.tsx
    ├── message-form.tsx
    ├── conversation-api.ts
    └── conversation-types.ts
```

- インターン生詳細に「スカウトを送る」buttonと2,000文字のformを追加する。
- 送信成功後は作成・再利用したConversation詳細へ移動する。
- 会話一覧はloading、empty、error、20件paginationを扱う。
- 会話詳細は最新50件を古い順に表示し、過去pageへの導線を用意する。
- 自分のMessageと相手のMessageを色だけに依存せず、送信者名でも区別する。
- formに現在文字数と2,000文字上限を表示し、送信中は二重送信を防ぐ。
- 送信成功時はMessageを履歴末尾へ追加し、textareaを空にする。
- 通信失敗時は入力本文を保持して再送できるようにする。
- 退会済み相手との会話ではformを表示せず、送信できない理由を表示する。
- 401はlogin、404は会話一覧へ戻る導線、422はform付近のエラーとして扱う。

## 8. セキュリティ・ログ

- participant判定はすべてRails APIで行う。
- 非participantへConversationやMessageの存在、相手、本文を開示しない。
- Message本文をrequest logへ残さない。
- sender、kind、participant IDをclient指定に依存しない。
- 一覧・詳細responseへemailや認証情報を含めない。
- rate limitはMVP後だが、二重送信はUIとDB transactionで可能な範囲を抑制する。

## 9. テスト設計

コード生成前に次の失敗するテストを追加する。

### Rails model / service / request

- participant role、組み合わせ一意制約、sender参加関係、kind、本文境界を検証する。
- 初回スカウトでConversationとMessageをtransaction内に作成する。
- 同じ組み合わせではConversationを再利用し、Messageだけ増やす。
- 空・2,001文字の本文ではConversationもMessageも残さない。
- companyだけが会話を開始でき、未掲載・退会済みprofileを指定できない。
- 自分のConversationだけを20件単位で最新順に返す。
- 履歴を50件単位、各page内で送信日時順に返す。
- participantは返信でき、非participantは閲覧・送信とも同じ404になる。
- sender_idとkindの不正parameterを無視する。
- 退会済みparticipantを含むConversationへの送信を拒否する。
- responseとログへemail、認証情報、不要なparticipant IDを含めない。

### Next.js

- スカウトformの文字数、入力エラー、二重送信、成功遷移を検証する。
- 会話一覧のloading、empty、error、相手、最新概要、paginationを表示する。
- 会話詳細の履歴を順番どおり表示し、自分と相手の送信者名を表示する。
- 返信成功で末尾追加・入力クリア、失敗で本文保持を検証する。
- 退会済み相手では送信formを表示しない。
- 401、404、validation errorの導線を検証する。

## 10. 対象外

- 未読数、既読、メール・push通知
- WebSocketによるリアルタイム更新
- Message編集・削除、添付ファイル
- グループ会話、ブロック、通報
- 応募処理とapplication Message作成

## 11. 完了条件

- 同じ組み合わせのConversationが重複せず、スカウトと返信を継続できる。
- participant以外が一覧・履歴・送信を利用できない。
- 2,000文字境界、transaction、pagination、退会済み制御をテストできる。
- loading、empty、error、closed状態を画面で確認できる。
- Rails・frontend test、lint、型チェック、build、Zeitwerk、セキュリティ検査が成功する。
