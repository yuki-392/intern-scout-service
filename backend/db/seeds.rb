module DemoSeeds
  module_function

  def run
    ActiveRecord::Base.transaction do
      stacks = create_stacks
      companies = create_companies
      interns = create_interns(stacks)
      postings = create_postings(companies, stacks)
      create_shared_history(companies, interns, postings)
    end
  end

  def create_stacks
    %w[Rails React TypeScript Next.js PostgreSQL Python Docker].to_h do |name|
      [ name, TechnicalStack.find_or_create_by!(normalized_name: TechnicalStack.normalize_name(name)) { |stack| stack.name = name } ]
    end
  end

  def create_companies
    [
      [ "company@demo.example", "Demo Tech株式会社", "Webサービスの設計・開発を通じて、学生が実践的に学べる環境を提供しています。", "https://example.com" ],
      [ "startup@demo.example", "みらいプロダクト株式会社", "データを活用して新しいプロダクト体験をつくるスタートアップです。", "https://example.org" ]
    ].to_h do |email, name, description, website_url|
      user = upsert_user(email:, role: "company")
      company = Company.find_or_initialize_by(user:)
      company.update!(name:, description:, website_url:)
      [ email, company ]
    end
  end

  def create_interns(stacks)
    data = [
      [ "intern@demo.example", "山田 デモ", "青空大学", "3年", "授業のチーム開発でRails APIを担当し、PostgreSQLのテーブル設計とDockerによる開発環境を構築しました。", "バックエンドエンジニア", %w[Rails PostgreSQL Docker] ],
      [ "frontend-intern@demo.example", "佐藤 サンプル", "未来大学", "2年", "学内イベント管理Webアプリを制作し、ReactとTypeScriptを使った画面設計・実装を担当しました。", "フロントエンドエンジニア", %w[React TypeScript Next.js] ],
      [ "data-intern@demo.example", "鈴木 テスト", "青空大学", "修士1年", "研究データを集計するPythonスクリプトと、結果を確認できるダッシュボードを制作しました。", "データエンジニア", %w[Python PostgreSQL Docker] ]
    ]

    data.to_h do |email, display_name, school_name, grade, bio, desired_role, stack_names|
      user = upsert_user(email:, role: "intern")
      profile = InternProfile.find_or_initialize_by(user:)
      profile.update!(display_name:, school_name:, grade:, bio:, desired_role:)
      replace_profile_stacks(profile, stack_names.map { |name| stacks.fetch(name) })
      [ email, user ]
    end
  end

  def create_postings(companies, stacks)
    data = [
      [ "company@demo.example", "Rails API開発インターン", "Rails APIの機能開発とテストに取り組みます。", "週3日・一部リモート可", %w[Rails PostgreSQL Docker] ],
      [ "company@demo.example", "Reactフロントエンドインターン", "ユーザー向け画面の設計と実装を行います。", "週2日以上・リモート中心", %w[React TypeScript Next.js] ],
      [ "startup@demo.example", "データ活用インターン", "プロダクトデータの集計と改善提案を体験できます。", "週3日・東京オフィス", %w[Python PostgreSQL] ]
    ]

    data.to_h do |company_email, title, description, work_conditions, stack_names|
      company = companies.fetch(company_email)
      posting = JobPosting.find_or_initialize_by(company:, title:)
      posting.update!(description:, work_conditions:, status: "published")
      replace_job_stacks(posting, stack_names.map { |name| stacks.fetch(name) })
      [ title, posting ]
    end
  end

  def create_shared_history(companies, interns, postings)
    company_user = companies.fetch("company@demo.example").user
    intern = interns.fetch("intern@demo.example")
    conversation = Conversation.find_or_create_by!(company_user:, intern_user: intern) do |item|
      item.last_messaged_at = Time.current
    end

    Message.find_or_create_by!(conversation:, sender: company_user, kind: "scout", body: "プロフィールを拝見し、ぜひ一度お話ししたいと思いました。")
    application_message = Message.find_or_create_by!(conversation:, sender: intern, kind: "application", body: "募集内容に興味を持ち応募しました。よろしくお願いします。")
    Application.find_or_create_by!(job_posting: postings.fetch("Rails API開発インターン"), intern_user: intern) do |application|
      application.conversation = conversation
      application.message = application_message
    end
  end

  def upsert_user(email:, role:)
    user = User.find_or_initialize_by(email:)
    user.role = role
    user.password = demo_password
    user.password_confirmation = demo_password
    user.deleted_at = nil
    user.save!
    user
  end

  def demo_password
    ENV.fetch("DEMO_USER_PASSWORD") do
      raise "DEMO_USER_PASSWORD must be set before loading demo seed data"
    end
  end

  def replace_profile_stacks(profile, stacks)
    profile.intern_profile_technical_stacks.destroy_all
    stacks.each_with_index { |stack, position| profile.intern_profile_technical_stacks.create!(technical_stack: stack, position:) }
  end

  def replace_job_stacks(posting, stacks)
    posting.job_posting_technical_stacks.destroy_all
    stacks.each_with_index { |stack, position| posting.job_posting_technical_stacks.create!(technical_stack: stack, position:) }
  end
end

DemoSeeds.run
