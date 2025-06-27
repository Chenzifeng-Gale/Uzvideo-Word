// ignore
//@name:短剧搜
//@webSite:https://duanjugou.top
//@version:1
//@remark:短剧搜搜索功能
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
    _webSite: 'https://duanjugou.top',
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

// 获取带随机参数的URL（防止缓存）
function getRandomizedUrl(baseUrl) {
    const random = Math.floor(Math.random() * 1000000);
    return `${baseUrl}?rand=${random}`;
}

// 修复URL
function fixUrl(url) {
    if (!url) return '';
    
    if (url.startsWith('http')) {
        return url;
    }
    
    if (url.startsWith('//')) {
        return 'https:' + url;
    }
    
    return appConfig.webSite + (url.startsWith('/') ? url : '/' + url);
}

/**
 * 获取分类列表 - 空实现
 */
async function getClassList(args) {
    const backData = new RepVideoClassList();
    return JSON.stringify(backData);
}

/**
 * 获取二级分类列表 - 空实现
 */
async function getSubclassList(args) {
    const backData = new RepVideoSubclassList();
    return JSON.stringify(backData);
}

/**
 * 获取分类视频列表 - 空实现
 */
async function getVideoList(args) {
    const backData = new RepVideoList();
    return JSON.stringify(backData);
}

/**
 * 获取二级分类视频列表 - 空实现
 */
async function getSubclassVideoList(args) {
    const backData = new RepVideoList();
    return JSON.stringify(backData);
}

/**
 * 获取视频详情 - 空实现
 */
async function getVideoDetail(args) {
    const backData = new RepVideoDetail();
    return JSON.stringify(backData);
}

/**
 * 获取播放地址 - 空实现
 */
async function getVideoPlayUrl(args) {
    const backData = new RepVideoPlayUrl();
    return JSON.stringify(backData);
}

/**
 * 搜索视频 - 核心功能
 */
async function searchVideo(args) {
    const backData = new RepVideoList();
    try {
        const page = args.page || 1;
        const searchWord = encodeURIComponent(args.searchWord);
        
        // 构建搜索URL
        const baseUrl = `${appConfig.webSite}/vodsearch/${searchWord}------------${page}---.html`;
        const url = getRandomizedUrl(baseUrl);
        
        // 发送搜索请求
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
            throw new Error('未获取到搜索结果页面数据');
        }
        
        // 检查是否被重定向到验证页面
        if (resp.data.includes('验证码') || resp.data.includes('Cloudflare')) {
            throw new Error('网站要求验证码，请稍后再试');
        }
        
        const $ = cheerio.load(resp.data);
        const list = [];
        
        // 解析搜索结果 - 使用多种选择器方案
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
            throw new Error('未找到搜索结果元素');
        }
        
        items.each(function() {
            try {
                const $el = $(this);
                
                // 图片元素 - 尝试多种可能的选择器
                let $img = $el.find('[class*="pics"]');
                if ($img.length === 0) $img = $el.find('img');
                if ($img.length === 0) $img = $el.find('a').first();
                
                // 标题元素 - 尝试多种可能的选择器
                let $title = $el.find('[class*="title"]');
                if ($title.length === 0) $title = $el.find('h2, h3, h4, h5');
                if ($title.length === 0) $title = $el.find('a').last();
                
                // 获取图片URL
                let vod_pic = $img.attr('data-original') || 
                              $img.attr('data-src') || 
                              $img.attr('src') || 
                              '';
                
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
                // 忽略单个项解析错误
            }
        });
        
        backData.data = list;
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}
