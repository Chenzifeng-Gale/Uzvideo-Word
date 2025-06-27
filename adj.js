// @name:[嗅] 爱短剧
// @version:1
// @webSite:https://www.aiduanju.cc
// @remark:爱短剧完整功能（首页/电视剧/电影/短剧）
// @order: D

const appConfig = {
  // ... 其他配置保持不变 ...

  // 更新分类配置
  firstClass: [
    {
      name: '首页推荐',
      id: 'recommend', // 特殊标识，用于首页推荐
      filter: []
    },
    {
      name: '电视剧',
      id: 'dianshiju',
      filter: []
    },
    {
      name: '电影',
      id: 'dianying',
      filter: []
    },
    {
      name: '短剧',
      id: 'duanju',
      filter: []
    }
  ],

  // ... 其他配置保持不变 ...
};

// ================ 分类功能 ================ //

/**
 * 获取分类列表
 */
async function getClassList(args) {
  var backData = new RepVideoClassList();
  try {
    const firstClass = appConfig.firstClass.map(category => ({
      type_name: category.name,
      type_id: category.id,
      hasSubclass: category.filter.length > 0,
    }));
    
    backData.data = firstClass;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

/**
 * 获取分类视频列表（特殊处理首页推荐）
 */
async function getVideoList(args) {
  var backData = new RepVideoList();
  try {
    var url = '';
    
    // 首页推荐特殊处理
    if (args.url === 'recommend') {
      // 直接使用网站首页作为推荐内容
      url = appConfig.webSite;
    } else {
      // 其他分类使用标准URL
      url = appConfig.mainListUrl
        .replace('@{webSite}', appConfig.webSite)
        .replace('@{mainId}', args.url)
        .replace('@{page}', args.page);
    }
    
    // 获取数据
    const respData = await req(url, {
      headers: appConfig.headers,
    });
    
    const htmlStr = respData.data ?? '';
    const $ = cheerio.load(htmlStr);
    
    // 解析视频列表
    const videoList = parseVideoList($);
    backData.data = videoList;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

// ================ 首页推荐解析 ================ //

/**
 * 解析视频列表（增加首页特殊处理）
 */
function parseVideoList($) {
  // 首页推荐的特殊选择器
  if ($('.fed-pops-navbar').length > 0) {
    return parseHomePage($);
  }
  
  // 其他分类的标准解析
  const videoListLiTag = appConfig.videoListLiTag;
  const videoItems = $(`${videoListLiTag.name}.${videoListLiTag.class.replaceAll(' ', '.')}`);
  
  var list = [];
  for (let index = 0; index < videoItems.length; index++) {
    const element = videoItems[index];
    const $element = cheerio.load(element);
    
    // 解析图片
    const imageTag = appConfig.vImageTag;
    const imageElement = $element(`${imageTag.name}.${imageTag.class.replaceAll(' ', '.')}`);
    let imageUrl = parseImage(imageElement);
    
    // 解析名称
    const nameTag = appConfig.vNameTag;
    const nameElement = $element(`${nameTag.name}.${nameTag.class.replaceAll(' ', '.')}`);
    const name = nameElement.text().trim();
    
    // 解析详情页链接
    const href = findHref($element, imageElement, nameElement) || '';
    
    if (name && href) {
      list.push({
        vod_pic: imageUrl,
        vod_name: name,
        vod_id: removeDomain(href),
      });
    }
  }
  
  return list;
}

/**
 * 解析首页推荐内容
 */
function parseHomePage($) {
  var list = [];
  
  // 解析轮播图推荐
  const sliderItems = $('.fed-swip-item.fed-part-2by3');
  sliderItems.each((index, element) => {
    const $el = $(element);
    const imageUrl = $el.find('img').attr('data-original') || $el.find('img').attr('src') || '';
    const name = $el.find('.fed-list-title').text().trim();
    const href = $el.attr('href') || '';
    
    if (name && href) {
      list.push({
        vod_pic: imageUrl,
        vod_name: name,
        vod_id: removeDomain(href),
      });
    }
  });
  
  // 解析分类区块推荐
  const sectionBlocks = $('.fed-tabs-boxs > .fed-tab-item');
  sectionBlocks.each((index, element) => {
    const $section = $(element);
    const videoItems = $section.find('.fed-list-item');
    
    videoItems.each((i, item) => {
      const $item = $(item);
      const imageUrl = $item.find('img').attr('data-original') || $item.find('img').attr('src') || '';
      const name = $item.find('.fed-list-title').text().trim();
      const href = $item.find('a').attr('href') || '';
      
      if (name && href) {
        list.push({
          vod_pic: imageUrl,
          vod_name: name,
          vod_id: removeDomain(href),
        });
      }
    });
  });
  
  return list;
}

// ... 其他函数保持不变 ...