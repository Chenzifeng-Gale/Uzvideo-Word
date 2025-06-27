// @name:[嗅] 爱短剧
// @version:1
// @webSite:https://www.aiduanju.cc
// @remark:爱短剧完整功能（首页/电视剧/电影/短剧）
// @order: D

var appConfig = {
  get headers() {
    return {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    };
  },

  get playHeaders() {
    return {
      Referer: this.webSite
    };
  },

  _webSite: 'https://www.aiduanju.cc',
  
  // 分类列表URL模板
  mainListUrl: '@{webSite}/vodshow/@{mainId}--------@{page}---.html',
  
  // 分类配置
  firstClass: [
    {
      name: '首页推荐',
      id: 'recommend',
      filter: []
    },
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
  ],
  
  // 分类视频列表元素
  videoListLiTag: {
    name: 'li',
    class: 'fed-list-item fed-padding fed-col-xs4 fed-col-sm3 fed-col-md2'
  },
  
  // 视频图片元素
  vImageTag: {
    name: 'a',
    class: 'fed-list-pics fed-lazy fed-part-2by3'
  },
  
  // 视频名称元素
  vNameTag: {
    name: 'a',
    class: 'fed-list-title fed-font-xiv fed-text-center fed-text-sm-left fed-visible fed-part-eone'
  },
  
  // 播放线路列表
  playFromTag: {
    name: 'ul',
    class: 'fed-part-rows'
  },
  
  // 剧集元素
  episodeItemTag: {
    name: 'a',
    class: 'fed-btns-info fed-rims-info fed-part-eone'
  },
  
  // 搜索链接
  searchUrl: '@{webSite}/vodsearch/@{searchWord}------------@{page}---.html',
  
  // 搜索结果列表元素
  searchListTag: {
    name: 'li',
    class: 'fed-list-item fed-padding fed-col-xs4 fed-col-sm3 fed-col-md2'
  },

  get webSite() {
    if (this._webSite.endsWith('/')) {
      this._webSite = this._webSite.substring(0, this._webSite.length - 1);
    }
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
  }
};

// ================ 核心函数 ================ //

/**
 * 获取分类列表
 */
async function getClassList(args) {
  var backData = new RepVideoClassList();
  try {
    var firstClass = [];
    for (var i = 0; i < appConfig.firstClass.length; i++) {
      var category = appConfig.firstClass[i];
      firstClass.push({
        type_name: category.name,
        type_id: category.id,
        hasSubclass: category.filter.length > 0
      });
    }
    backData.data = firstClass;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

/**
 * 获取分类视频列表
 */
async function getVideoList(args) {
  var backData = new RepVideoList();
  try {
    var url = '';
    var page = args.page || 1;
    
    // 首页推荐特殊处理
    if (args.url === 'recommend') {
      url = appConfig.webSite;
    } else {
      url = appConfig.mainListUrl
        .replace('@{webSite}', appConfig.webSite)
        .replace('@{mainId}', args.url)
        .replace('@{page}', page);
    }
    
    // 获取数据
    var respData = await req(url, {
      headers: appConfig.headers
    });
    
    var htmlStr = respData.data || '';
    var $ = cheerio.load(htmlStr);
    
    // 解析视频列表
    var videoList = parseVideoList($);
    backData.data = videoList;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

/**
 * 获取视频详情
 */
async function getVideoDetail(args) {
  var backData = new RepVideoDetail();
  try {
    var url = combineUrl(args.url);
    var respData = await req(url, {
      headers: appConfig.headers
    });
    
    var htmlStr = respData.data || '';
    var $ = cheerio.load(htmlStr);
    
    // 解析播放列表
    var playFromTag = appConfig.playFromTag;
    var playFromSelector = playFromTag.name + '.' + playFromTag.class.replace(/\s+/g, '.');
    var playFromHtmlList = $(playFromSelector);
    
    var playUrl = '';
    for (var i = 0; i < playFromHtmlList.length; i++) {
      var element = playFromHtmlList[i];
      var episodeItemTag = appConfig.episodeItemTag;
      var episodeSelector = episodeItemTag.name + '.' + episodeItemTag.class.replace(/\s+/g, '.');
      var episodes = $(element).find(episodeSelector);
      
      for (var j = 0; j < episodes.length; j++) {
        var ep = episodes[j];
        var $ep = $(ep);
        var href = $ep.attr('href') || '';
        var title = $ep.text().trim();
        
        if (href && title) {
          playUrl += title + '$' + removeDomain(href) + '#';
        }
      }
      
      playUrl += '$$$';
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
 * 获取播放地址
 */
async function getVideoPlayUrl(args) {
  var backData = new RepVideoPlayUrl();
  try {
    var url = combineUrl(args.url);
    backData.sniffer = {
      url: url,
      ua: appConfig.headers['User-Agent']
    };
    backData.headers = appConfig.playHeaders;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

/**
 * 搜索视频
 */
async function searchVideo(args) {
  var backData = new RepVideoList();
  try {
    // 构建搜索URL
    var url = appConfig.searchUrl
      .replace('@{webSite}', appConfig.webSite)
      .replace('@{searchWord}', args.searchWord)
      .replace('@{page}', args.page || 1);
    
    // 获取搜索结果
    var respData = await req(url, {
      headers: appConfig.headers
    });
    
    var htmlStr = respData.data || '';
    var $ = cheerio.load(htmlStr);
    
    // 解析搜索结果
    var videoList = parseVideoList($);
    backData.data = videoList;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

// ================ 工具函数 ================ //

/**
 * 解析视频列表
 */
function parseVideoList($) {
  var list = [];
  
  // 首页特殊处理
  if ($('body').hasClass('fed-index-body')) {
    // 解析轮播图
    var sliderItems = $('.fed-swip-item.fed-part-2by3');
    for (var i = 0; i < sliderItems.length; i++) {
      var element = sliderItems[i];
      var $el = $(element);
      var imageEl = $el.find('img');
      var imageUrl = imageEl.attr('data-original') || imageEl.attr('src') || '';
      var name = $el.find('.fed-list-title').text().trim();
      var href = $el.attr('href') || '';
      
      if (name && href) {
        list.push({
          vod_pic: imageUrl,
          vod_name: name,
          vod_id: removeDomain(href)
        });
      }
    }
    
    // 解析分类区块
    var sectionBlocks = $('.fed-tabs-boxs > .fed-tab-item');
    for (var j = 0; j < sectionBlocks.length; j++) {
      var section = sectionBlocks[j];
      var $section = $(section);
      var videoItems = $section.find('.fed-list-item');
      
      for (var k = 0; k < videoItems.length; k++) {
        var item = videoItems[k];
        var $item = $(item);
        var imageEl = $item.find('img');
        var imageUrl = imageEl.attr('data-original') || imageEl.attr('src') || '';
        var name = $item.find('.fed-list-title').text().trim();
        var href = $item.find('a').attr('href') || '';
        
        if (name && href) {
          list.push({
            vod_pic: imageUrl,
            vod_name: name,
            vod_id: removeDomain(href)
          });
        }
      }
    }
  } 
  // 其他页面处理
  else {
    var videoListLiTag = appConfig.videoListLiTag;
    var selector = videoListLiTag.name + '.' + videoListLiTag.class.replace(/\s+/g, '.');
    var videoItems = $(selector);
    
    for (var index = 0; index < videoItems.length; index++) {
      var element = videoItems[index];
      var $element = $(element);
      
      // 解析图片
      var imageTag = appConfig.vImageTag;
      var imageSelector = imageTag.name + '.' + imageTag.class.replace(/\s+/g, '.');
      var imageElement = $element.find(imageSelector);
      var imageUrl = parseImage(imageElement);
      
      // 解析名称
      var nameTag = appConfig.vNameTag;
      var nameSelector = nameTag.name + '.' + nameTag.class.replace(/\s+/g, '.');
      var nameElement = $element.find(nameSelector);
      var name = nameElement.text().trim();
      
      // 解析详情页链接
      var href = imageElement.attr('href') || nameElement.attr('href') || '';
      
      if (name && href) {
        list.push({
          vod_pic: imageUrl,
          vod_name: name,
          vod_id: removeDomain(href)
        });
      }
    }
  }
  
  return list;
}

/**
 * 组合完整URL
 */
function combineUrl(url) {
  if (url.indexOf('http') === 0) {
    return url;
  } else if (url.startsWith('/')) {
    return appConfig.webSite + url;
  } else {
    return appConfig.webSite + '/' + url;
  }
}

/**
 * 移除域名部分
 */
function removeDomain(url) {
  if (!url) return '';
  var domain = appConfig.webSite;
  if (url.indexOf(domain) === 0) {
    return url.substring(domain.length);
  }
  return url;
}

/**
 * 解析图片URL
 */
function parseImage(imageHtml) {
  if (!imageHtml || imageHtml.length === 0) return '';
  
  // 检查data-original属性
  var dataOriginal = imageHtml.attr('data-original');
  if (dataOriginal && dataOriginal.indexOf('http') === 0) {
    return dataOriginal;
  }
  
  // 检查其他属性
  var possibleAttrs = ['src', 'data-src'];
  for (var i = 0; i < possibleAttrs.length; i++) {
    var attr = possibleAttrs[i];
    var value = imageHtml.attr(attr);
    if (value && value.indexOf('http') === 0) {
      return value;
    }
  }
  
  return '';
}

// ================ 其他必要函数 ================ //

async function getSubclassList(args) {
  return JSON.stringify(new RepVideoSubclassList());
}

async function getSubclassVideoList(args) {
  return JSON.stringify(new RepVideoList());
}
