# TranslatePress 激活工具

这是一个基于Node.js和Puppeteer的工具，用于自动访问网站上的所有页面，以激活TranslatePress插件的翻译功能。

## 背景

TranslatePress 插件通常需要在页面被访问时才会激活翻译。它是一种前端翻译插件，通过在页面加载时动态翻译内容来工作。当用户访问网站页面时，TranslatePress 会根据设置的语言和翻译规则，将页面内容实时翻译并显示。

这个工具可以模拟用户访问，遍历网站的所有页面，从而激活TranslatePress对所有页面内容的翻译。

## 功能

- 支持解析sitemap.xml和sitemap_index.xml
- 自动递归处理sitemap索引中的所有子地图
- 实时显示处理进度
- 显示已访问的URL列表
- 使用Puppeteer模拟真实浏览器访问

## 安装

1. 确保已安装Node.js（版本14.0.0或更高）
2. 克隆此仓库
3. 安装依赖：

```bash
npm install
```

## 使用方法

1. 启动服务：

```bash
npm start
```

2. 在浏览器中访问：http://localhost:3000
3. 输入网站的sitemap.xml或sitemap_index.xml URL
4. 点击"开始处理"按钮
5. 在进度页面查看处理状态

## 部署到Vercel

此项目可以轻松部署到Vercel上：

1. Fork此仓库到自己的GitHub账户
2. 在Vercel中导入该项目
3. 点击部署即可

## 注意事项

- 处理大型网站时可能需要较长时间
- 某些网站可能限制爬虫访问，可能需要调整访问间隔
- 在生产环境中使用时，建议添加访问限速和认证机制

## 许可证

MIT 