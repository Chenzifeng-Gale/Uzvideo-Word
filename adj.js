// ignore
//@name:爱短剧
//@webSite:https://www.aiduanju.cc
//@version:1.2
//@remark:爱短剧完整功能（电视剧/电影/短剧）- 修复版
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

// 调试函数
function debugLog(message) {
    try {
        toast(message); // 尝试在APP中显示调试信息
    } catch (e) {
        // 如果toast不可用，忽略
    }
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
        debugLog(`获取分类成功: ${classes.length}个分类`);
    } catch (error) {
        backData.error = error.toString();
        debugLog(`获取分类错误: ${error}`);
    }
    return JSON.stringify(backData);
}

/**
 * 获取二级分类列表
 */
async function getSubclassList(args) {
    const backData = new RepVideoSubclassList();
    try {
        // 该网站没有二级分类
        backData.data = { filter: [] };
        debugLog(`获取二级分类: 无二级分类`);
    } catch (error) {
        backData.error = error.toString();
        debugLog(`获取二级分类错误: ${error}`);
    }
    return JSON.stringify(backData);
}

/**
 * 获取分类视频列表
 */
async function getVideoList(args) {
    const backData = new RepVideoList();
    try {
        const page = args.page || 1;
        const categoryId = args.url;
        const url = `${appConfig.webSite}/vodshow/${categoryId}--------${page}---.html`;
        
        debugLog(`请求分类列表: ${url}`);
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
                'Referer': appConfig.webSite
            }
        });
        
        if (!resp.data) {
            throw new Error('未获取到页面数据');
        }
        
        debugLog(`获取页面成功，长度: ${resp.data.length}字符`);
        
        const $ = cheerio.load(resp.data);
        const list = [];
        
        // 更可靠的选择器 - 使用更通用的类名
        const items = $('.fed-list-item');
        debugLog(`找到列表项: ${items.length}个`);
        
        items.each(function() {
            try {
                const $el = $(this);
                
                // 图片元素 - 尝试多个可能的选择器
                let $img = $el.find('.fed-list-pics');
                if ($img.length === 0) $img = $el.find('a[class*="pics"]');
                if ($img.length === 0) $img = $el.find('a').first();
                
                // 标题元素 - 尝试多个可能的选择器
                let $title = $el.find('.fed-list-title');
                if ($title.length === 0) $title = $el.find('.fed-list-head');
                if ($title.length === 0) $title = $el.find('a[class*="title"]');
                if ($title.length === 0) $title = $el.find('a').last();
                
                const vod_pic = $img.attr('data-original') || $img.attr('src') || $img.find('img').attr('src') || '';
                const vod_name = $title.text().trim();
                const vod_id = $img.attr('href') || $title.attr('href') || '';
                
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
        
        debugLog(`成功解析视频: ${list.length}个`);
        backData.data = list;
    } catch (error) {
        backData.error = error.toString();
        debugLog(`获取列表错误: ${error}`);
    }
    return JSON.stringify(backData);
}

/**
 * 获取视频详情
 */
async function getVideoDetail(args) {
    const backData = new RepVideoDetail();
    try {
        const url = fixUrl(args.url);
        debugLog(`请求详情页: ${url}`);
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
                'Referer': appConfig.webSite
            }
        });
        
        if (!resp.data) {
            throw new Error('未获取到详情页数据');
        }
        
        const $ = cheerio.load(resp.data);
        let playUrl = '';
        
        // 播放线路 - 使用更通用的选择器
        const playLines = $('.fed-part-rows, .player-list, .playlist');
        debugLog(`找到播放线路: ${playLines.length}个`);
        
        playLines.each(function() {
            try {
                const $line = $(this);
                const episodes = $line.find('a');
                
                episodes.each(function() {
                    try {
                        const $a = $(this);
                        const title = $a.text().trim();
                        const href = $a.attr('href') || '';
                        
                        if (title && href) {
                            playUrl += `${title}$${fixUrl(href)}#`;
                        }
                    } catch (e) {
                        debugLog(`解析剧集错误: ${e.message}`);
                    }
                });
                
                playUrl += '$$$';
            } catch (e) {
                debugLog(`解析播放线路错误: ${e.message}`);
            }
        });
        
        debugLog(`构建播放列表完成`);
        backData.data = {
            vod_play_url: playUrl
        };
    } catch (error) {
        backData.error = error.toString();
        debugLog(`获取详情错误: ${error}`);
    }
    return JSON.stringify(backData);
}

/**
 * 获取播放地址
 */
async function getVideoPlayUrl(args) {
    const backData = new RepVideoPlayUrl();
    try {
        const url = fixUrl(args.url);
        debugLog(`请求播放地址: ${url}`);
        
        backData.sniffer = {
            url: url,
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
        };
        backData.headers = {
            Referer: appConfig.webSite
        };
    } catch (error) {
        backData.error = error.toString();
        debugLog(`获取播放地址错误: ${error}`);
    }
    return JSON.stringify(backData);
}

/**
 * 搜索视频
 */
async function searchVideo(args) {
    const backData = new RepVideoList();
    try {
        const page = args.page || 1;
        const searchWord = encodeURIComponent(args.searchWord);
        const url = `${appConfig.webSite}/vodsearch/${searchWord}------------${page}---.html`;
        
        debugLog(`搜索请求: ${url}`);
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
                'Referer': appConfig.webSite
            }
        });
        
        if (!resp.data) {
            throw new Error('未获取到搜索结果');
        }
        
        const $ = cheerio.load(resp.data);
        const list = [];
        
        // 使用与分类列表相同的解析逻辑
        const items = $('.fed-list-item');
        debugLog(`找到搜索结果: ${items.length}个`);
        
        items.each(function() {
            try {
                const $el = $(this);
                
                // 图片元素
                let $img = $el.find('.fed-list-pics');
                if ($img.length === 0) $img = $el.find('a[class*="pics"]');
                
                // 标题元素
                let $title = $el.find('.fed-list-title');
                if ($title.length === 0) $title = $el.find('.fed-list-head');
                
                const vod_pic = $img.attr('data-original') || $img.attr('src') || '';
                const vod_name = $title.text().trim();
                const vod_id = $img.attr('href') || $title.attr('href') || '';
                
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
        
        debugLog(`解析到搜索结果: ${list.length}个`);
        backData.data = list;
    } catch (error) {
        backData.error = error.toString();
        debugLog(`搜索错误: ${error}`);
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
