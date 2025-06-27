// ignore
//@name:爱短剧
//@webSite:https://www.aiduanju.cc
//@version:1
//@remark:爱短剧完整功能（电视剧/电影/短剧）
//@order: D
// ignore

// ignore
import {
    FilterLabel,
    FilterTitle,
    VideoClass,
    VideoSubclass,
    VideoDetail,
    RepVideoClassList,
    RepVideoSubclassList,
    RepVideoList,
    RepVideoDetail,
    RepVideoPlayUrl,
    UZArgs,
    UZSubclassVideoListArgs,
} from '../core/uzVideo.js'

import {
    UZUtils,
    ProData,
    ReqResponseType,
    ReqAddressType,
    req,
    getEnv,
    setEnv,
    goToVerify,
    openWebToBindEnv,
    toast,
    kIsDesktop,
    kIsAndroid,
    kIsIOS,
    kIsWindows,
    kIsMacOS,
    kIsTV,
    kLocale,
    kAppVersion,
    formatBackData,
} from '../core/uzUtils.js'

import { cheerio, Crypto, Encrypt, JSONbig } from '../core/uz3lib.js'
// ignore

const appConfig = {
    _webSite: 'https://www.aiduanju.cc',
    get webSite() {
        return this._webSite
    },
    set webSite(value) {
        this._webSite = value
    },

    _uzTag: '',
    get uzTag() {
        return this._uzTag
    },
    set uzTag(value) {
        this._uzTag = value
    },
}

// 分类配置
const videoClasses = [
    {
        name: '电视剧',
        id: '2',
        filter: []
    },
    {
        name: '电影',
        id: '1',
        filter: []
    },
    {
        name: '短剧',
        id: '3',
        filter: []
    }
]

/**
 * 获取分类列表
 */
async function getClassList(args) {
    const backData = new RepVideoClassList()
    try {
        const classes = videoClasses.map(category => ({
            type_name: category.name,
            type_id: category.id,
            hasSubclass: category.filter.length > 0
        }))
        backData.data = classes
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取二级分类列表
 */
async function getSubclassList(args) {
    const backData = new RepVideoSubclassList()
    try {
        // 该网站没有二级分类
        backData.data = { filter: [] }
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取分类视频列表
 */
async function getVideoList(args) {
    const backData = new RepVideoList()
    try {
        const page = args.page || 1
        const url = `${appConfig.webSite}/vodshow/${args.url}--------${page}---.html`
        
        const resp = await req(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
        })
        
        const $ = cheerio.load(resp.data)
        const list = []
        
        $('li.fed-list-item').each((index, element) => {
            const $el = $(element)
            const img = $el.find('a.fed-list-pics')
            const title = $el.find('a.fed-list-title')
            
            const vod_pic = img.attr('data-original') || img.attr('src') || ''
            const vod_name = title.text().trim()
            const vod_id = img.attr('href') || title.attr('href') || ''
            
            if (vod_name && vod_id) {
                list.push({
                    vod_pic: vod_pic.startsWith('http') ? vod_pic : `${appConfig.webSite}${vod_pic}`,
                    vod_name,
                    vod_id: vod_id.startsWith('http') ? vod_id : `${appConfig.webSite}${vod_id}`
                })
            }
        })
        
        backData.data = list
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取二级分类视频列表
 */
async function getSubclassVideoList(args) {
    // 该网站没有二级分类，直接调用主分类列表
    return getVideoList(args)
}

/**
 * 获取视频详情
 */
async function getVideoDetail(args) {
    const backData = new RepVideoDetail()
    try {
        const url = args.url.startsWith('http') ? args.url : `${appConfig.webSite}${args.url}`
        const resp = await req(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
        })
        
        const $ = cheerio.load(resp.data)
        let playUrl = ''
        
        $('ul.fed-part-rows').each((index, element) => {
            $(element).find('a.fed-btns-info').each((i, el) => {
                const $a = $(el)
                const title = $a.text().trim()
                const href = $a.attr('href') || ''
                
                if (title && href) {
                    const fullUrl = href.startsWith('http') ? href : `${appConfig.webSite}${href}`
                    playUrl += `${title}$${fullUrl}#`
                }
            })
            playUrl += '$$$'
        })
        
        backData.data = {
            vod_play_url: playUrl
        }
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取播放地址
 */
async function getVideoPlayUrl(args) {
    const backData = new RepVideoPlayUrl()
    try {
        const url = args.url.startsWith('http') ? args.url : `${appConfig.webSite}${args.url}`
        backData.sniffer = {
            url: url,
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
        }
        backData.headers = {
            Referer: appConfig.webSite
        }
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 搜索视频
 */
async function searchVideo(args) {
    const backData = new RepVideoList()
    try {
        const page = args.page || 1
        const url = `${appConfig.webSite}/vodsearch/${args.searchWord}------------${page}---.html`
        
        const resp = await req(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
        })
        
        const $ = cheerio.load(resp.data)
        const list = []
        
        $('li.fed-list-item').each((index, element) => {
            const $el = $(element)
            const img = $el.find('a.fed-list-pics')
            const title = $el.find('a.fed-list-title')
            
            const vod_pic = img.attr('data-original') || img.attr('src') || ''
            const vod_name = title.text().trim()
            const vod_id = img.attr('href') || title.attr('href') || ''
            
            if (vod_name && vod_id) {
                list.push({
                    vod_pic: vod_pic.startsWith('http') ? vod_pic : `${appConfig.webSite}${vod_pic}`,
                    vod_name,
                    vod_id: vod_id.startsWith('http') ? vod_id : `${appConfig.webSite}${vod_id}`
                })
            }
        })
        
        backData.data = list
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}
