# 角色圖片放置說明

請把以下三張圖片放在這個資料夾（`public/character/`）：

| 檔名 | 用途 |
|------|------|
| `base.png` | 灰階底圖（會被染色） |
| `mask.png` | 剪影遮罩，純黑白 PNG，用來限制染色範圍 |
| `overlay.png` | 頂層圖，不會被染色（例如角、裝飾） |

放好之後訪問 `http://localhost:5173/?page=color` 就能看到換色效果。
