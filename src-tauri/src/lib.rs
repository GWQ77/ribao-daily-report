mod portable;
mod xlsx;
/// 数据库迁移。
fn migrations() -> Vec<tauri_plugin_sql::Migration> {
    vec![tauri_plugin_sql::Migration {
        version: 1,
        description: "create diary table",
        sql: "CREATE TABLE IF NOT EXISTS diary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diary_date ON diary(date);",
        kind: tauri_plugin_sql::MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebView2 用户数据目录必须在本进程创建 WebView 之前设置，
    // 否则缓存会落到 %LOCALAPPDATA%\com.ribao.diary，违背便携原则。
    portable::ensure_dirs();
    let exe_dir = portable::exe_dir().to_path_buf();
    std::env::set_var(
        "WEBVIEW2_USER_DATA_FOLDER",
        exe_dir.join(".cache").join("webview"),
    );

    let db_url = portable::db_url();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(&db_url, migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            portable::portable_paths,
            portable::read_config,
            portable::write_config,
            portable::write_text_file,
            portable::read_text_file,
            portable::export_weekly_xlsx,
            portable::open_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ribao");
}
