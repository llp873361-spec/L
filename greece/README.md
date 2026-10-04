# 古希腊 vibe 知识大赏

## 安装

```
npm install
npx playwright install chromium
```

还要有 ffmpeg：

```
brew install ffmpeg          # macOS
sudo apt install ffmpeg      # Ubuntu
winget install ffmpeg        # Windows
```

## 运行

```
node render.js               # 产出 out/video.mp4、out/cover.png、out/check/*.png
node render.js --keep        # 同上，保留 out/frames 里的逐帧 png
node render.js --at 2.2,3.8  # 同上，另外导出这几个时刻的检查图
```

预览：用 Chrome 打开 `index.html`，地址后面加 `?debug=1` 看安全区。
