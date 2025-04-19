const axios = require('axios');
const xml2js = require('xml2js');
const puppeteer = require('puppeteer');

/**
 * 解析sitemap XML文件并提取所有URL
 * @param {string} sitemapUrl - sitemap.xml或sitemap_index.xml的URL
 * @returns {Promise<string[]>} - 包含所有页面URL的数组
 */
async function parseSitemap(sitemapUrl) {
  try {
    // 获取sitemap内容
    const response = await axios.get(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    // 检查是否是sitemap索引
    if (result.sitemapindex && result.sitemapindex.sitemap) {
      // 是sitemap索引，需要递归处理
      const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
        ? result.sitemapindex.sitemap 
        : [result.sitemapindex.sitemap];
      
      const allUrls = [];
      for (const sitemap of sitemaps) {
        const sitemapLoc = sitemap.loc;
        // 添加随机延迟，防止请求过于频繁
        await randomDelay(1000, 3000);
        const urlsFromSitemap = await parseSitemap(sitemapLoc);
        allUrls.push(...urlsFromSitemap);
      }
      return allUrls;
    } else if (result.urlset && result.urlset.url) {
      // 是普通sitemap
      const urls = Array.isArray(result.urlset.url) 
        ? result.urlset.url 
        : [result.urlset.url];
      
      return urls.map(url => url.loc);
    } else {
      throw new Error('无效的sitemap格式');
    }
  } catch (error) {
    console.error('解析sitemap出错:', error.message);
    throw error;
  }
}

/**
 * 随机延迟函数
 * @param {number} min - 最小延迟时间（毫秒）
 * @param {number} max - 最大延迟时间（毫秒）
 * @returns {Promise<void>}
 */
function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 模拟人类行为
 * @param {Object} page - Puppeteer页面对象
 */
async function simulateHumanBehavior(page) {
  // 随机滚动
  await page.evaluate(() => {
    const scrollDistance = Math.floor(Math.random() * 700) + 300;
    window.scrollBy(0, scrollDistance);
  });
  
  await randomDelay(500, 1500);
  
  // 再次滚动
  await page.evaluate(() => {
    const scrollDistance = Math.floor(Math.random() * 500) + 200;
    window.scrollBy(0, scrollDistance);
  });
  
  await randomDelay(700, 2000);
  
  // 有时候回到顶部
  if (Math.random() > 0.7) {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await randomDelay(500, 1000);
  }
}

/**
 * 使用Puppeteer访问所有URL
 * @param {string[]} urls - 要访问的URL数组
 * @param {Object} taskState - 任务状态对象，用于更新进度
 * @param {Object} options - 配置选项
 */
async function visitAllUrls(urls, taskState, options = {}) {
  const {
    delayMin = 3000,           // 页面之间最小延迟（毫秒）
    delayMax = 10000,          // 页面之间最大延迟（毫秒）
    loadWaitTime = 5000,       // 页面加载后等待时间（毫秒）
    simulateHuman = true,      // 是否模拟人类行为
    maxConcurrent = 1,         // 最大并发数（建议保持为1）
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  } = options;

  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  try {
    // 批量处理URL，控制并发数
    const batches = [];
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      batches.push(urls.slice(i, i + maxConcurrent));
    }
    
    for (const batch of batches) {
      const promises = batch.map(url => processUrl(url, browser, taskState, {
        loadWaitTime,
        simulateHuman,
        userAgent
      }));
      
      await Promise.all(promises);
      
      // 批次间添加随机延迟
      await randomDelay(delayMin, delayMax);
    }
  } finally {
    // 完成所有URL访问后关闭浏览器
    await browser.close();
    taskState.isRunning = false;
  }
}

/**
 * 处理单个URL
 * @param {string} url - 要访问的URL
 * @param {Object} browser - Puppeteer浏览器实例
 * @param {Object} taskState - 任务状态对象
 * @param {Object} options - 配置选项
 */
async function processUrl(url, browser, taskState, options) {
  // 更新当前处理的URL
  taskState.currentUrl = url;
  
  try {
    // 创建新页面
    const page = await browser.newPage();
    
    // 设置用户代理
    await page.setUserAgent(options.userAgent);
    
    // 设置其他headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // 随机设置视口大小，模拟不同设备
    const width = 1100 + Math.floor(Math.random() * 300);
    const height = 700 + Math.floor(Math.random() * 200);
    await page.setViewport({ width, height });
    
    // 设置超时时间
    page.setDefaultNavigationTimeout(60000); // 60秒
    
    // 导航到URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // 等待页面完全加载
    await randomDelay(1000, options.loadWaitTime);
    
    // 模拟人类行为
    if (options.simulateHuman) {
      await simulateHumanBehavior(page);
    }
    
    // 关闭页面
    await page.close();
    
    // 记录已访问的URL
    taskState.visitedUrls.push(url);
    
    // 随机延迟，避免访问过于规律
    await randomDelay(1000, 3000);
  } catch (pageError) {
    console.error(`访问 ${url} 时出错:`, pageError.message);
    // 即使出错也继续处理其他URL
    taskState.visitedUrls.push(`${url} (访问出错: ${pageError.message})`);
  }
}

module.exports = {
  parseSitemap,
  visitAllUrls
}; 