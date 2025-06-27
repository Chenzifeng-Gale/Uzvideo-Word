// ignore
//@name:[嗅] 爱短剧
//@version:1
//@webSite:https://www.aiduanju.cc
//@remark:爱短剧完整功能（电视剧/电影/短剧）
//@order: D
// ignore

/// 使用 PC 模式
const isUsePC = 1
/// 不需要额外添加 Referer
const isAddReferer = 0

// 网站主页
const webSite = 'https://www.aiduanju.cc'
// 网站搜索
const searchUrl = '@{webSite}/vodsearch/@{searchWord}------------@{page}---.html'
// 当前网站任意视频详情页
const videoDetailPage = '@{webSite}/voddetail/123.html'
// 当前网站任意视频播放页
const videoPlayPage = '@{webSite}/vodplay/123-1-1.html'

// 保持不变
const filterListUrl = ''

const firstClass = [
    {
        name: '电视剧',
        id: '电视剧',
        subClass: [
            {
                name: '全部',
                id: '@{webSite}/vodshow/2--------@{page}---.html',
            }
        ],
    },
    {
        name: '电影',
        id: '电影',
        subClass: [
            {
                name: '全部',
                id: '@{webSite}/vodshow/1--------@{page}---.html',
            }
        ],
    },
    {
        name: '短剧',
        id: '短剧',
        subClass: [
            {
                name: '全部',
                id: '@{webSite}/vodshow/3--------@{page}---.html',
            }
        ],
    },
]

// 下面这个不要有任何改动，且保持在最后一行，加载内置代码需要
//#BaseCode1#
