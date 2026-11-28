# 孟自力心血管科普网站

面向大众的心血管健康科普平台，内容涵盖 PFO（卵圆孔未闭）、瓣膜病、冠心病、先心病、大血管疾病，以及预防、饮食、烹饪与运动。**全部内容仅供健康科普，不构成诊疗建议，不能替代医生当面诊治。**

## 在线地址

- 科普主站：<https://drzimeng.cn/>
- 科普博客：<https://drzimeng.cn/blog/>
- GitHub 主页：<https://github.com/drzimeng/>
- 仓库源码：<https://github.com/drzimeng/cardiology-site>

## 域名与 GitHub Pages

- 仓库根目录 `CNAME` 文件内容：`drzimeng.cn`
- DNS：`@` 指向 GitHub Pages 四个 A 记录（185.199.108/109/110/111.153）；`www` CNAME 指向 `drzimeng.github.io`
- GitHub 仓库 Settings → Pages：Custom domain 为 `drzimeng.cn`，已开启 **Enforce HTTPS**
- 旧地址 `https://drzimeng.github.io/cardiology-site/` 会 301 跳转至新域名，历史链接可用

## 目录结构

```text
index.html                 科普主页
assets/js/social-links.js  全站社交/平台链接集中配置
blog/                      博客列表、文章与构建脚本
CNAME                      GitHub Pages 自定义域名声明
.nojekyll                  保留原始静态资源目录
```

## 社交与平台链接

全站页脚链接统一在 `assets/js/social-links.js` 的 `SOCIAL_LINKS` 数组中维护；主页与全部博客页自动生效，无需逐页修改 HTML。

## 本地预览

直接用静态服务器打开仓库根目录即可，例如：

```bash
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000/
```

## 发布流程

推送到 `main` 分支后，GitHub Pages 通常在 1–3 分钟内上线。发布前请确认域名可访问；公众号「阅读原文」链接群发后不可修改。
