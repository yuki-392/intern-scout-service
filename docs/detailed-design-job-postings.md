# 募集・応募 詳細設計

## 1. 対象

本書はUS-03「募集閲覧」、US-04「募集応募」、US-09「募集作成・編集」を実装するための
詳細設計を定める。応募時は既存のConversation・Messageを再利用する。

## 2. 設計方針

- companyは自社募集だけを作成・編集・公開停止できる。
- 企業紹介とホームページURLはCompanyで共通管理し、どの募集フォームから更新しても全募集へ反映する。
- internには公開中の募集だけを開示する。
- 応募、会話作成または再利用、自動Message作成を一つのDB transactionで行う。
- 同じinternは同じ企業へ1回だけ応募できる。
- 募集を非公開にしても、過去のApplication、Conversation、Messageは保持する。
- 一覧は20件単位とし、公開日時の新しい順で安定して表示する。

## 3. 入力仕様

| 項目 | 必須 | 上限・形式 |
|---|---|---|
| タイトル | 必須 | 1〜100文字 |
| 業務内容 | 必須 | 1〜2,000文字 |
| 勤務条件 | 必須 | 1〜1,000文字 |
| 技術スタック | 任意 | 1件1〜50文字、最大20件 |
| 企業紹介 | 任意 | 最大2,000文字、企業共通 |
| 企業ホームページURL | 任意 | 最大2,048文字、HTTP/HTTPS、企業共通 |
| 公開状態 | 必須 | `draft` または `published` |

前後空白は除去し、本文中の改行は保持する。技術スタックはプロフィールと同じNFKC・
空白・小文字の正規化を使い、正規化後の重複を拒否する。

## 4. データ設計

Companyへ任意の`description`と`website_url`を追加する。募集保存時はCompanyと
JobPostingを同じtransactionで更新し、一方だけが保存される状態を防ぐ。

### 4.1 job_postings

| カラム | 型 | NULL | 用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| company_id | bigint | false | 掲載企業 |
| title | string | false | 最大100文字 |
| description | text | false | 業務内容、最大2,000文字 |
| work_conditions | text | false | 勤務条件、最大1,000文字 |
| status | string | false | `draft` / `published` |
| published_at | datetime | true | 最初または再公開した日時 |
| created_at / updated_at | datetime | false | 日時 |

- company外部キーとstatus check constraintを設定する。
- 公開時は `published_at` を設定し、公開停止時も過去値を保持する。
- 公開一覧は `status = published` かつCompany Userがactiveなものだけを対象にする。

### 4.2 job_posting_technical_stacks

JobPostingとTechnicalStackの中間tableとし、`position` 0〜19を持つ。profile側と同様に
組み合わせ・positionの一意制約、position check constraint、外部キーを設定する。

### 4.3 applications

| カラム | 型 | NULL | 用途 |
|---|---|---|---|
| id | bigint | false | 主キー |
| job_posting_id | bigint | false | 対象募集 |
| intern_user_id | bigint | false | 応募者 |
| conversation_id | bigint | false | 応募先との会話 |
| message_id | bigint | false | 自動Message |
| created_at / updated_at | datetime | false | 日時 |

- `(job_posting_id, intern_user_id)` に一意indexを設定する。
- 関連4項目へ外部キーを設定する。
- intern role、募集企業とConversation company participantの一致をapplication validationで検証する。

## 5. API設計

### 5.1 企業向け募集管理

- `GET /api/v1/company/job_postings`: 自社募集を20件単位で全status表示
- `GET /api/v1/company/job_postings/:id`: 自社募集詳細
- `POST /api/v1/company/job_postings`: draftまたはpublishedで作成、201
- `PATCH /api/v1/company/job_postings/:id`: 内容・status更新、200

company以外は403、他社募集は存在しない募集と同じ404にする。作成・更新では募集本体と
技術スタック関連をtransactionで保存し、不正時は既存募集を変更しない。

### 5.2 公開募集

- `GET /api/v1/job_postings?page=1`: intern向け公開一覧、20件
- `GET /api/v1/job_postings/:id`: intern向け公開詳細

一覧・詳細はinternのみ利用できる。draft、退会済み企業、不存在は同じ404または一覧から
除外する。responseは募集ID、企業名、入力項目、技術スタック、公開日時、`applied` を返す。

### 5.3 応募

`POST /api/v1/job_postings/:id/applications`

- 認証: internのみ
- CSRF必須
- 公開募集のみ応募可能
- 成功: 201
- 重複応募: 409 `already_applied`
- draft・退会済み企業・不存在: 404

transaction処理:

1. 公開中かつ企業Userがactiveな募集をlockして取得する。
2. Applicationの重複を確認する。
3. 募集企業とinternのConversationを取得または作成する。
4. internをsender、`application` をkindとして定型Messageを作成する。
5. ApplicationへConversationとMessageを関連付けて保存する。

定型本文は「募集『{募集タイトル}』に応募しました。プロフィールをご確認ください。」とする。
一意制約違反も409へ変換し、連打・同時requestで重複Messageを残さない。

## 6. response・公開範囲

- 公開募集に企業担当者のemail、User IDを含めない。
- 企業向けresponseにも応募者情報を含めない。応募者専用一覧はMVP対象外である。
- 一覧metaは `current_page`、`total_pages`、`total_count`、`per_page: 20` とする。
- 状態変更responseは保存後の募集、応募responseはApplication ID、Conversation ID、Messageを返す。

## 7. Rails構成

```text
app/controllers/api/v1/company/job_postings_controller.rb
app/controllers/api/v1/job_postings_controller.rb
app/controllers/api/v1/applications_controller.rb
app/models/job_posting.rb
app/models/job_posting_technical_stack.rb
app/models/application.rb
app/services/job_postings/upsert.rb
app/services/applications/create.rb
```

Controllerは認証・認可・HTTP処理、serviceは複数modelのtransactionを担当する。
一覧ではCompany・TechnicalStack・Application有無をpreloadし、N+1 queryを防ぐ。

## 8. Next.js構成

```text
app/company/jobs/page.tsx
app/company/jobs/new/page.tsx
app/company/jobs/[id]/edit/page.tsx
app/jobs/page.tsx
app/jobs/[id]/page.tsx
features/job-postings/*
```

- 企業画面は一覧、作成、編集、公開・公開停止を扱う。
- intern画面は公開一覧、詳細、応募確認dialog、応募済み状態を扱う。
- formは文字数、技術スタック20件、複数error、二重送信を扱う。
- formは企業情報と募集内容を分け、企業情報がすべての募集へ共通反映されることを明示する。
- 公開募集詳細は「企業について」に紹介文と安全な外部リンクを表示する。
- 応募確認dialogには「{募集タイトル}に応募しますか？」と「はい」「いいえ」を表示する。
- 「はい」を選んだ場合だけ応募APIを呼び、企業へ定型の自動Messageを送信する。
- 同じ企業へ応募済みの場合は、その企業の別募集も「応募済み」の無効ボタンで表示する。
- 応募成功後は「応募しました」と会話へのリンクを表示する。
- loading、empty、error、404を各画面で明示する。
- 401はlogin、403はrole別既定画面へ遷移する。

## 9. セキュリティ・ログ

- 所有企業、role、公開状態をRailsで検証する。
- title、description、work_conditionsを通常request logへ残さない。
- Applicationのintern Userはcurrent Userから設定する。
- Conversation、Messageのsender・kindはserver側で設定する。
- draft募集の存在や内容を他社・internへ開示しない。

## 10. テスト設計

コード生成前に次のREDテストを追加する。

### Rails

- 各文字数境界、status、所有企業、技術スタック20件と正規化重複を検証する。
- 自社募集だけを作成・更新・一覧表示でき、他社募集を404にする。
- 不正更新時に募集と技術スタックを変更しない。
- 公開募集だけを20件単位で返し、draft・退会企業を隠す。
- 応募でApplication、Conversation、application Messageをtransaction内に作成する。
- 既存Conversationを再利用する。
- 重複・同時応募でApplicationとMessageを増やさない。
- 非公開化後も既存応募・会話・Messageを保持する。
- role、CSRF、非公開項目、N+1を検証する。

### Next.js

- 企業formの入力、文字数、stack、error、二重送信、公開状態を検証する。
- 自社一覧と公開募集一覧のloading、empty、error、paginationを検証する。
- 公開詳細、404、応募確認、応募済み表示を検証する。
- 応募成功で会話リンクを表示し、重複応募errorを扱う。

## 11. 対象外

- 募集検索・お気に入り
- 応募辞退、選考status、応募者専用一覧
- 募集と通常スカウトの明示的な関連
- 募集削除（公開停止で対応）

## 12. 完了条件

- 企業が自社募集を作成・編集・公開停止できる。
- internが公開募集を閲覧し、同じ企業へ1回だけ応募できる。
- 応募transactionで会話と定型Messageが作成または再利用される。
- 権限外・draft・重複・入力境界をテストできる。
- Rails・frontend test、lint、型チェック、build、Zeitwerk、セキュリティ検査が成功する。
