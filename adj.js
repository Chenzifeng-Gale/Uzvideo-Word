// ignore
//@name:爱短剧
//@webSite:https://www.aiduanju.cc
//@version:1
//@remark:爱短剧完整功能（电视剧/电影/短剧）
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
        // 该网站没有二级分类
        backData.data = { filter: [] };
    } catch (error) {
        backData.error = error.toString();
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
        const url = `${appConfig.webSite}/vodshow/${args.url}--------${page}---.html`;
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
                'Referer': appConfig.webSite
            }
        });
        
        const $ = cheerio.load(resp.data);
        const list = [];
        
        $('li.fed-list-item').each(function() {
            const $el = $(this);
            const $img = $el.find('a.fed-list-pics');
            const $title = $el.find('a.fed-list-title');
            
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
        });
        
        backData.data = list;
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 获取二级分类视频列表
 */
async function getSubclassVideoList(args) {
    // 该网站没有二级分类，直接调用主分类列表
    return getVideoList(args);
}

/**
 * 获取视频详情
 */
async function getVideoDetail(args) {
    const backData = new RepVideoDetail();
    try {
        const url = fixUrl(args.url);
        const resp = await req(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
                'Referer': appConfig.webSite
            }
        });
        
        const $ = cheerio.load(resp.data);
        let playUrl = '';
        
        $('ul.fed-part-rows').each(function() {
            $(this).find('a.fed-btns-info').each(function() {
                const $a = $(this);
                const title = $a.text().trim();
                const href = $a.attr('href') || '';
                
                if (title && href) {
                    playUrl += `${title}$${fixUrl(href)}#`;
                }
            });
            playUrl += '$$$';
        });
        
        backData.data = {
            vod_play_url: playUrl
        };
    } catch (error) {
        backData.error = error.toString();
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
        backData.sniffer = {
            url: url,
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
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
 * 搜索视频
 */
async function searchVideo(args) {
    const backData = new RepVideoList();
    try {
        const page = args.page || 1;
        const searchWord = encodeURIComponent(args.searchWord);
        const url = `${appConfig.webSite}/vodsearch/${searchWord}------------${page}---.html`;
        
        const resp = await req(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
                'Referer': appConfig.webSite
            }
        });
        
        const $ = cheerio.load(resp.data);
        const list = [];
        
        $('li.fed-list-item').each(function() {
            const $el = $(this);
            const $img = $el.find('a.fed-list-pics');
            const $title = $el.find('a.fed-list-title');
            
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
