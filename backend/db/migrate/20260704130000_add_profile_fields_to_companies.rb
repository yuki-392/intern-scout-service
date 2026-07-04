class AddProfileFieldsToCompanies < ActiveRecord::Migration[8.1]
  def change
    add_column :companies, :description, :text
    add_column :companies, :website_url, :string, limit: 2_048
  end
end
