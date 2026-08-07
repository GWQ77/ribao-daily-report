@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ==========================================
echo  构建便携版日报工具 (Tauri no-bundle)
echo ==========================================

where npm >nul 2>nul || (echo [错误] 未找到 npm & exit /b 1)

echo [1/3] 安装前端依赖...
if not exist "node_modules" call npm install --no-audit --no-fund || exit /b 1

echo [2/3] 构建前端 + Rust 可执行文件...
rem 降低 cargo 并行度，规避 Windows 下并发 spawn build-script 偶发的"拒绝访问"
set "CARGO_BUILD_JOBS=2"
call npm run tauri build -- --no-bundle || exit /b 1

echo [3/3] 拷贝 exe 到 release 目录...
if not exist "release" mkdir release
copy /Y "src-tauri\target\release\ribao.exe" "release\ribao.exe" >nul || exit /b 1

rem 清理 Rust debug 缓存，避免 target 目录膨胀
if exist "src-tauri\target\debug" rmdir /s /q "src-tauri\target\debug"

echo.
echo 构建完成：release\ribao.exe
echo 双击运行，数据将保存在 exe 同级目录（data\ 与 config.json）。
endlocal
