use std::path::{Path, PathBuf};
use std::sync::OnceLock;

/// exe 所在目录（便携基准）。所有数据/配置/缓存都在这里。
pub fn exe_dir() -> &'static Path {
    static DIR: OnceLock<PathBuf> = OnceLock::new();
    DIR.get_or_init(|| {
        std::env::current_exe()
            .expect("failed to locate current exe")
            .parent()
            .expect("failed to locate exe directory")
            .to_path_buf()
    })
}

/// <exe>/data/diary.db
pub fn db_path() -> PathBuf {
    exe_dir().join("data").join("diary.db")
}

/// 供 tauri-plugin-sql 的绝对路径（正斜杠）。
/// 插件内部会把它 push 到 app_config_dir 上，但 Rust PathBuf::push
/// 遇到绝对路径会整体替换，因此 db 最终落在 exe 旁。
pub fn db_url() -> String {
    let s = db_path().to_string_lossy().replace('\\', "/");
    format!("sqlite:{s}")
}

/// <exe>/config.json
pub fn config_path() -> PathBuf {
    exe_dir().join("config.json")
}

pub fn ensure_dirs() {
    let _ = std::fs::create_dir_all(exe_dir().join("data"));
    let _ = std::fs::create_dir_all(exe_dir().join(".cache"));
}

#[derive(serde::Serialize)]
pub struct PortablePaths {
    db_url: String,
    db_path: String,
    config_path: String,
    exe_dir: String,
}

/// 返回所有便携路径，前端据此定位数据库与配置。
#[tauri::command]
pub fn portable_paths() -> PortablePaths {
    ensure_dirs();
    PortablePaths {
        db_url: db_url(),
        db_path: db_path().to_string_lossy().into_owned(),
        config_path: config_path().to_string_lossy().into_owned(),
        exe_dir: exe_dir().to_string_lossy().into_owned(),
    }
}

#[tauri::command]
pub fn read_config() -> String {
    ensure_dirs();
    let path = config_path();
    if path.exists() {
        std::fs::read_to_string(&path).unwrap_or_else(|_| "{}".to_string())
    } else {
        // 首次运行创建空配置，默认值由前端补齐
        let _ = std::fs::write(&path, "{}");
        "{}".to_string()
    }
}

#[tauri::command]
pub fn write_config(json: String) -> Result<(), String> {
    ensure_dirs();
    let path = config_path();
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

/// 写文本文件（导出 md / 备份 JSON）。路径由用户通过对话框选择。
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

/// 读取文本文件（还原 JSON）。
#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// 生成周报 xlsx 并保存到指定路径。
/// headers: 表头数组；rows: 数据行（每行是单元格数组）。
#[tauri::command]
pub fn export_weekly_xlsx(
    path: String,
    sheet_name: String,
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
) -> Result<(), String> {
    let hs: Vec<&str> = headers.iter().map(|s| s.as_str()).collect();
    let bytes = crate::xlsx::build_xlsx(&sheet_name, &hs, &rows)?;
    if let Some(parent) = Path::new(&path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

/// 用系统默认程序打开文件（历史周报等）。
#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(format!("文件不存在: {path}"));
    }
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
