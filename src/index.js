const express = require('express');
const path = require('path');
const { parseSitemap, visitAllUrls } = require('./sitemap-processor');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置EJS作为模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 解析请求主体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use(express.static(path.join(__dirname, '../public')));

// 全局状态，用于存储当前任务的信息
const taskState = {
  isRunning: false,
  totalUrls: 0,
  visitedUrls: [],
  currentUrl: null,
  error: null
};

// 访问配置
const visitOptions = {
  delayMin: 3000,            // 页面间最小延迟（毫秒）
  delayMax: 10000,           // 页面间最大延迟（毫秒）
  loadWaitTime: 5000,        // 页面加载后等待时间（毫秒）
  simulateHuman: true,       // 是否模拟人类行为
  maxConcurrent: 1,          // 最大并发数量（建议为1）
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// 主页路由
app.get('/', (req, res) => {
  res.render('index', { taskState });
});

// 提交sitemap URL的路由
app.post('/process-sitemap', async (req, res) => {
  const { sitemapUrl, delayMin, delayMax, simulateHuman } = req.body;
  
  if (!sitemapUrl) {
    return res.status(400).json({ error: '请提供有效的sitemap URL' });
  }

  if (taskState.isRunning) {
    return res.status(409).json({ error: '任务已在执行中' });
  }

  // 更新配置（如果用户提供了参数）
  if (delayMin) visitOptions.delayMin = parseInt(delayMin);
  if (delayMax) visitOptions.delayMax = parseInt(delayMax);
  if (simulateHuman !== undefined) visitOptions.simulateHuman = simulateHuman === 'true';

  // 重置状态
  taskState.isRunning = true;
  taskState.totalUrls = 0;
  taskState.visitedUrls = [];
  taskState.currentUrl = null;
  taskState.error = null;

  try {
    // 解析sitemap
    const urls = await parseSitemap(sitemapUrl);
    taskState.totalUrls = urls.length;
    
    // 重定向到进度页面
    res.redirect('/progress');
    
    // 异步访问所有URL
    visitAllUrls(urls, taskState, visitOptions).catch(err => {
      console.error('访问URL出错:', err);
      taskState.error = err.message;
      taskState.isRunning = false;
    });
  } catch (error) {
    console.error('解析sitemap出错:', error);
    taskState.error = error.message;
    taskState.isRunning = false;
    res.status(500).json({ error: `解析sitemap出错: ${error.message}` });
  }
});

// 进度页面路由
app.get('/progress', (req, res) => {
  res.render('progress', { taskState });
});

// 配置页面路由
app.get('/config', (req, res) => {
  res.render('config', { options: visitOptions });
});

// 更新配置路由
app.post('/update-config', (req, res) => {
  const { delayMin, delayMax, loadWaitTime, simulateHuman, maxConcurrent, userAgent } = req.body;
  
  if (delayMin) visitOptions.delayMin = parseInt(delayMin);
  if (delayMax) visitOptions.delayMax = parseInt(delayMax);
  if (loadWaitTime) visitOptions.loadWaitTime = parseInt(loadWaitTime);
  if (simulateHuman !== undefined) visitOptions.simulateHuman = simulateHuman === 'true';
  if (maxConcurrent) visitOptions.maxConcurrent = parseInt(maxConcurrent);
  if (userAgent) visitOptions.userAgent = userAgent;
  
  res.redirect('/');
});

// API端点，返回当前任务状态
app.get('/api/status', (req, res) => {
  res.json({
    isRunning: taskState.isRunning,
    totalUrls: taskState.totalUrls,
    visitedCount: taskState.visitedUrls.length,
    visitedUrls: taskState.visitedUrls,
    currentUrl: taskState.currentUrl,
    error: taskState.error,
    options: visitOptions
  });
});

app.listen(PORT, () => {
  console.log(`服务器正在运行: http://localhost:${PORT}`);
}); 