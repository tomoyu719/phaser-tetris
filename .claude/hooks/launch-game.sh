#!/bin/bash

# Viteの開発サーバーが起動していなければ起動する
PORT=5173

# ポートが使用中かチェック
if lsof -i :$PORT > /dev/null 2>&1; then
    # サーバーは既に起動中 → ブラウザだけ開く
    open "http://localhost:$PORT"
    exit 0
fi

# プロジェクトディレクトリに移動
cd "$CLAUDE_PROJECT_DIR" || exit 1

# バックグラウンドでdev serverを起動してブラウザで開く
nohup npm run dev -- --open > /dev/null 2>&1 &

exit 0
