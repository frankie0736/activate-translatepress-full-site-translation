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
    const response = await axios.get(sitemapUrl);
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
 * 使用Puppeteer访问所有URL
 * @param {string[]} urls - 要访问的URL数组
 * @param {Object} taskState - 任务状态对象，用于更新进度
 */
async function visitAllUrls(urls, taskState) {
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const url of urls) {
      // 更新当前处理的URL
      taskState.currentUrl = url;
      
      try {
        // 创建新页面
        const page = await browser.newPage();
        
        // 设置超时时间
        page.setDefaultNavigationTimeout(60000); // 60秒
        
        // 导航到URL
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // 等待页面完全加载（可能需要等待TranslatePress初始化）
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 关闭页面
        await page.close();
        
        // 记录已访问的URL
        taskState.visitedUrls.push(url);
        
        // 休息一下，避免压力过大
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (pageError) {
        console.error(`访问 ${url} 时出错:`, pageError.message);
        // 即使出错也继续处理其他URL
        taskState.visitedUrls.push(`${url} (访问出错: ${pageError.message})`);
      }
    }
  } finally {
    // 完成所有URL访问后关闭浏览器
    await browser.close();
    taskState.isRunning = false;
  }
}

module.exports = {
  parseSitemap,
  visitAllUrls
}; 