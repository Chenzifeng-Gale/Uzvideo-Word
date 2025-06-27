// ignore
//@name:爱短剧
//@webSite:https://www.aiduanju.cc
//@version:1.3
//@remark:爱短剧完整功能（电视剧/电影/短剧）- 反爬版
//@order: D
// ignore

// ignore
import {
    RepVideoClassList,
    RepVideoSubclassList,
    RepVideoList,
    RepVideoDetail,
    RepVideoPlayUrl,
} from '../core/uzVideo.js'

import {
    req,
    toast
} from '../core/uzUtils.js'

import { cheerio } from '../core/uz3lib.js'
// ignore

const appConfig = {
    _webSite: 'https://www.aiduanju.cc',
    get webSite() {
        return this._webSite;
    },
    set webSite(value) {
        this._webSite = value;
    },

    _uzTag: '',
    get uzTag() {
        return this._uzTag;
    },
    set uzTag(value) {
        this._uzTag = value;
    },
};

// 分类配置
const videoClasses = [
    { name: '电视剧', id: '2' },
    { name: '电影', id: '1' },
    { name: '短剧', id: '3' }
];

// 随机User-Agent列表
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; SM-S901U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
];

// 获取随机User-Agent
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 调试函数
function debugLog(message) {
    try {
        toast(message);
    } catch (e) {
        // 忽略
    }
}

// 获取带随机参数的URL（防止缓存）
function getRandomizedUrl(baseUrl) {
    const random = Math.floor(Math.random() * 1000000);
    return `${baseUrl}?rand=${random}`;
}

/**
 * 获取分类列表
 */
async function getClassList(args) {
    const backData = new RepVideoClassList();
    try {
        const classes = videoClasses.map(category => ({
            type_name: category.name,
            type_id: category.id,
            hasSubclass: false
        }));
        backData.data = classes;
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 获取二级分类列表
 */
async function getSubclassList(args) {
    const backData = new RepVideoSubclassList();
    try {
        backData.data = { filter: [] };
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 获取分类视频列表 - 带反爬措施
 */
async function getVideoList(args) {
    const backData = new RepVideoList();
    try {
        const page = args.page || 1;
        const categoryId = args.url;
        const baseUrl = `${appConfig.webSite}/vodshow/${categoryId}--------${page}---.html`;
        const url = getRandomizedUrl(baseUrl);
        
        debugLog(`请求分类列表: ${url}`);
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': getRandomUserAgent(),
                'Referer': appConfig.webSite,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
        
        if (!resp.data) {
            throw new Error('未获取到页面数据');
        }
        
        // 检查是否被重定向到验证页面
        if (resp.data.includes('验证码') || resp.data.includes('Cloudflare')) {
            throw new Error('网站要求验证码，请稍后再试');
        }
        
        const $ = cheerio.load(resp.data);
        const list = [];
        
        // 尝试多种选择器方案
        const selectors = [
            '.fed-list-item', // 主选择器
            '.fed-col-xs4',   // 备选选择器1
            '.fed-col-sm3',   // 备选选择器2
            '.fed-col-md2'    // 备选选择器3
        ];
        
        let items = $();
        for (const selector of selectors) {
            items = $(selector);
            if (items.length > 0) break;
        }
        
        if (items.length === 0) {
            throw new Error('未找到视频列表元素');
        }
        
        debugLog(`找到列表项: ${items.length}个`);
        
        items.each(function() {
            try {
                const $el = $(this);
                
                // 图片元素
                let $img = $el.find('[class*="pics"]');
                if ($img.length === 0) $img = $el.find('img');
                if ($img.length === 0) $img = $el.find('a').first();
                
                // 标题元素
                let $title = $el.find('[class*="title"]');
                if ($title.length === 0) $title = $el.find('h2, h3, h4, h5');
                if ($title.length === 0) $title = $el.find('a').last();
                
                // 获取图片URL
                let vod_pic = $img.attr('data-original') || 
                              $img.attr('data-src') || 
                              $img.attr('src') || 
                              $img.css('background-image').replace(/url\(['"]?(.*?)['"]?\)/, '$1');
                
                // 获取标题和链接
                const vod_name = $title.text().trim() || $el.text().trim().substring(0, 30);
                const vod_id = $img.attr('href') || $title.attr('href') || $el.find('a').attr('href');
                
                if (vod_name && vod_id) {
                    list.push({
                        vod_pic: fixUrl(vod_pic),
                        vod_name: vod_name,
                        vod_id: fixUrl(vod_id)
                    });
                }
            } catch (e) {
                debugLog(`解析列表项错误: ${e.message}`);
            }
        });
        
        backData.data = list;
    } catch (error) {
        backData.error = error.toString();
        debugLog(`获取列表错误: ${error}`);
    }
    return JSON.stringify(backData);
}

/**
 * 获取视频详情 - 带反爬措施
 */
async function getVideoDetail(args) {
    const backData = new RepVideoDetail();
    try {
        const url = getRandomizedUrl(fixUrl(args.url));
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': getRandomUserAgent(),
                'Referer': appConfig.webSite,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!resp.data) {
            throw new Error('未获取到详情页数据');
        }
        
        const $ = cheerio.load(resp.data);
        let playUrl = '';
        
        // 播放线路选择器
        const lineSelectors = [
            '.fed-part-rows', 
            '.player-list', 
            '.playlist',
            '.fed-tabs-btns'
        ];
        
        // 剧集选择器
        const episodeSelectors = [
            'a.fed-btns-info',
            '.episode-item',
            '.play-item',
            'a[href*="play"]'
        ];
        
        for (const lineSelector of lineSelectors) {
            const playLines = $(lineSelector);
            
            playLines.each(function() {
                const $line = $(this);
                let episodes = $();
                
                // 尝试多种剧集选择器
                for (const epSelector of episodeSelectors) {
                    episodes = $line.find(epSelector);
                    if (episodes.length > 0) break;
                }
                
                episodes.each(function() {
                    const $a = $(this);
                    const title = $a.text().trim() || `第${episodes.index($a) + 1}集`;
                    const href = $a.attr('href') || '';
                    
                    if (title && href) {
                        playUrl += `${title}$${fixUrl(href)}#`;
                    }
                });
                
                playUrl += '$$$';
            });
        }
        
        backData.data = {
            vod_play_url: playUrl
        };
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 获取播放地址 - 带反爬措施
 */
async function getVideoPlayUrl(args) {
    const backData = new RepVideoPlayUrl();
    try {
        const url = fixUrl(args.url);
        
        backData.sniffer = {
            url: url,
            ua: getRandomUserAgent(),
            headers: {
                'Referer': appConfig.webSite,
                'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            }
        };
        backData.headers = {
            Referer: appConfig.webSite
        };
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 搜索视频 - 带反爬措施
 */
async function searchVideo(args) {
    const backData = new RepVideoList();
    try {
        const page = args.page || 1;
        const searchWord = encodeURIComponent(args.searchWord);
        const baseUrl = `${appConfig.webSite}/vodsearch/${searchWord}------------${page}---.html`;
        const url = getRandomizedUrl(baseUrl);
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': getRandomUserAgent(),
                'Referer': appConfig.webSite,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!resp.data) {
            throw new Error('未获取到搜索结果');
        }
        
        const $ = cheerio.load(resp.data);
        const list = [];
        
        // 使用与分类列表相同的解析逻辑
        const selectors = [
            '.fed-list-item', 
            '.fed-col-xs4',
            '.fed-col-sm3',
            '.fed-col-md2'
        ];
        
        let items = $();
        for (const selector of selectors) {
            items = $(selector);
            if (items.length > 0) break;
        }
        
        items.each(function() {
            try {
                const $el = $(this);
                
                // 图片元素
                let $img = $el.find('[class*="pics"]');
                if ($img.length === 0) $img = $el.find('img');
                
                // 标题元素
                let $title = $el.find('[class*="title"]');
                if ($title.length === 0) $title = $el.find('h2, h3, h4, h5');
                
                // 获取图片URL
                let vod_pic = $img.attr('data-original') || 
                              $img.attr('data-src') || 
                              $img.attr('src') || '';
                
                // 获取标题和链接
                const vod_name = $title.text().trim() || $el.text().trim().substring(0, 30);
                const vod_id = $img.attr('href') || $title.attr('href') || $el.find('a').attr('href');
                
                if (vod_name && vod_id) {
                    list.push({
                        vod_pic: fixUrl(vod_pic),
                        vod_name: vod_name,
                        vod_id: fixUrl(vod_id)
                    });
                }
            } catch (e) {
                debugLog(`解析搜索结果错误: ${e.message}`);
            }
        });
        
        backData.data = list;
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 修复URL，确保是完整URL
 */
function fixUrl(url) {
    if (!url) return '';
    
    // 已经是完整URL
    if (url.startsWith('http')) {
        return url;
    }
    
    // 以//开头的URL
    if (url.startsWith('//')) {
        return 'https:' + url;
    }
    
    // 相对路径
    return appConfig.webSite + (url.startsWith('/') ? url : '/' + url);
}
