# 企業向けインターン生一覧・詳細・検索 詳細設計

## 1. 対象

本書は、US-06「インターン生一覧・詳細」とUS-07「インターン生検索」を実装するための
詳細設計を定める。スカウト送信と会話開始は次の実装単位とし、本書では詳細画面に
スカウト導線の配置場所を用意するところまでを扱う。

## 2. 設計方針

- ログイン済み企業担当者だけが、掲載済みプロフィールを閲覧できる。
- 検索条件とページ番号はURL queryへ反映し、再読み込みや共有で状態を再現できるようにする。
- 検索はPostgreSQLで行い、MVPでは外部検索サービスを追加しない。
- 異なる検索項目はAND、同一項目内は部分一致とする。
- 一覧は常に20件単位とし、無制限取得を行わない。
- 認可、掲載条件、検索条件はRails APIを正とする。
- 一覧と詳細で返す項目を明示し、emailやuser_idなどの認証情報を公開しない。

## 3. 検索仕様

| query | 対象 | 上限 | 照合方法 |
|---|---|---|---|
| `school_name` | 学校名 | 100文字 | 大文字小文字を区別しない部分一致 |
| `desired_role` | 希望職種 | 100文字 | 大文字小文字を区別しない部分一致 |
| `technical_stack` | 正規化済み技術スタック名 | 50文字 | 大文字小文字・全角半角を正規化した部分一致 |
| `page` | ページ番号 | 正の整数 | 未指定は1 |

- queryの前後空白は除去し、空文字は未指定として扱う。
- 複数種類の条件はすべて満たすプロフィールだけを返す。
- `%`、`_`、backslashは検索wildcardとして解釈せず、通常文字としてescapeする。
- 不正な `page`、上限超過した検索文字列は422 `validation_error` とする。
- 条件変更時はフロントエンドで `page=1` へ戻す。
- 並び順は `published_at DESC, id DESC` とし、ページ間で順序を安定させる。

## 4. 公開範囲

一覧・詳細で公開する項目:

- profile id
- 表示名
- 学校名
- 学年
- 経験・制作物
- 希望職種
- 技術スタック
- 掲載日時

一覧では経験・制作物を200文字までの概要として返し、詳細では全文を返す。email、user_id、
password関連、deleted_atは返さない。プロフィールが存在しても `published_at` がないもの、
退会済みUserに属するものは返さない。

## 5. API設計

### 5.1 `GET /api/v1/interns`

- 認証: 必須
- role: companyのみ
- page size: 20固定
- status: 200
- 未認証: 401
- intern role: 403 `role_not_allowed`
- query不正: 422
- `Cache-Control: no-store`

request例:

```text
GET /api/v1/interns?school_name=Example&desired_role=backend&technical_stack=ruby&page=2
```

response:

```json
{
  "data": [
    {
      "id": 1,
      "display_name": "たかし",
      "school_name": "Example大学",
      "grade": "3年",
      "bio_excerpt": "授業のチーム開発でWebアプリの画面実装を担当しました。",
      "desired_role": "バックエンドエンジニア",
      "technical_stacks": ["Ruby", "Rails"],
      "published_at": "2026-07-01T09:00:00Z"
    }
  ],
  "meta": {
    "current_page": 2,
    "total_pages": 3,
    "total_count": 45,
    "per_page": 20
  }
}
```

該当者がいない場合も200とし、`data: []`、`total_count: 0`、`total_pages: 0` を返す。
存在しないページは空配列を返し、404にはしない。

### 5.2 `GET /api/v1/interns/:id`

- 認証: 必須
- role: companyのみ
- status: 200
- 未認証: 401
- intern role: 403
- 未掲載、退会済み、存在しないprofile: 404 `not_found`
- `Cache-Control: no-store`

response:

```json
{
  "data": {
    "id": 1,
    "display_name": "たかし",
    "school_name": "Example大学",
    "grade": "3年",
    "bio": "授業のチーム開発でWebアプリの画面実装を担当しました。",
    "desired_role": "バックエンドエンジニア",
    "technical_stacks": ["Ruby", "Rails"],
    "published_at": "2026-07-01T09:00:00Z"
  }
}
```

未掲載と不存在を同じ404にし、非公開プロフィールの存在を推測しにくくする。

## 6. Rails実装方針

想定する主なファイル:

```text
backend/
├── app/controllers/api/v1/interns_controller.rb
├── app/queries/intern_profiles/search.rb
└── app/serializers/
    ├── intern_profile_list_serializer.rb
    └── intern_profile_detail_serializer.rb
```

- `InternProfiles::Search` が掲載条件、検索、並び順、paginationを組み立てる。
- Controllerは認証、role、query validation、responseに集中する。
- 技術スタック条件ではjoinによる重複行を `distinct` で除外する。
- serializerは一覧用と詳細用を分け、公開項目を増やす際の影響範囲を明確にする。
- 技術スタックをpreloadし、一覧20件でN+1 queryを起こさない。
- PostgreSQLの `ILIKE` と `sanitize_sql_like` を利用する。

検索用indexは、MVPデータ量では通常indexが部分一致へ効きにくいため追加しない。データ量と
実測を確認し、必要になった時点で `pg_trgm` とGIN indexを検討する。

## 7. Next.js実装方針

想定する主なファイル:

```text
frontend/src/
├── app/interns/page.tsx
├── app/interns/[id]/page.tsx
└── features/intern-search/
    ├── intern-search-page.tsx
    ├── intern-search-form.tsx
    ├── intern-list.tsx
    ├── intern-detail.tsx
    ├── intern-api.ts
    └── intern-types.ts
```

- pageはServer Component、API取得・検索操作・paginationはClient Componentへ分離する。
- 初回表示時にURL queryをフォーム初期値とAPI requestへ使用する。
- 検索buttonでqueryを更新し、ブラウザ履歴へ残す。
- 条件クリアbuttonで検索queryとpageを削除する。
- loading時は候補者カードのskeleton、0件時は検索条件を見直す案内を表示する。
- 通信失敗時は入力済み検索条件を保持し、再読み込みbuttonを表示する。
- 一覧カード全体を詳細へのリンクにせず、見出しリンクを明示して操作先を分かりやすくする。
- paginationには現在ページと総ページを表示し、最初・最後では該当buttonを無効化する。
- 詳細から一覧へ戻る際は、元の検索queryとpageを保持する。
- 401では `reason=session_expired` と安全な `return_to` を付けてloginへ移動する。
- 403ではcompany向け画面を表示せず、role別の既定画面へ戻す。
- 404では「プロフィールが見つかりません」を表示し、一覧へ戻る導線を用意する。

## 8. エラー・セキュリティ方針

- Rails APIでcompany roleを必ず検証する。
- 検索語をSQL文字列へ直接連結しない。
- 一覧・詳細responseとログへemailや認証情報を含めない。
- 想定内の空結果と404をerror logにしない。
- queryはURLに残るため、個人情報を検索条件として入力するUIにしない。
- API responseは `no-store` とし、共有端末のbrowser cacheへ候補者情報を残しにくくする。

## 9. テスト設計

コード生成前に次の失敗するテストを追加する。

### 9.1 Rails query / request

- 掲載済みかつ退会していないprofileだけを返す。
- 21件以上を20件ずつ安定した順序でpaginationする。
- 学校名、希望職種、技術スタックをそれぞれ部分一致で検索できる。
- 異なる検索条件をANDで組み合わせる。
- 技術スタックの全角半角・大文字小文字を正規化する。
- `%`、`_`、backslashを通常文字として検索する。
- 空結果で200、空配列、正しいmetaを返す。
- 不正pageと上限超過queryを422にする。
- 詳細は掲載済みprofileを返し、未掲載・退会済み・不存在を同じ404にする。
- 未認証を401、intern roleを403にする。
- 一覧・詳細にemail、user_id、認証情報を含めない。
- 一覧取得で技術スタックのN+1 queryを発生させない。

### 9.2 Next.js

- URL queryを検索フォームの初期値として表示する。
- 検索時にpageを1へ戻し、安全にencodeしたqueryへ更新する。
- 条件クリアで全検索条件を削除する。
- loading、空結果、通信失敗を表示する。
- 一覧に20件まで表示し、詳細リンクを持つ。
- paginationの現在位置と前後buttonを正しく表示する。
- 詳細に公開項目を表示し、一覧へ戻るqueryを保持する。
- 404状態と一覧への導線を表示する。
- 401でloginへ安全に遷移する。

## 10. 対象外

- 募集の検索
- 複数技術スタックの同時指定
- OR検索、除外条件、並び替え選択
- 検索候補のautocomplete
- お気に入り、比較リスト
- スカウト送信と会話作成

## 11. 完了条件

- companyだけが掲載済みプロフィールの一覧・詳細を閲覧できる。
- 3種類の部分一致検索とAND条件が正しく動作する。
- 20件単位のpaginationと安定した順序を確認できる。
- loading、empty、error、404を画面で確認できる。
- API responseへ非公開項目を含めない。
- Rails・frontend test、lint、型チェック、build、Zeitwerk、セキュリティ検査が成功する。
