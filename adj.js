// @name:[嗅] 爱短剧
// @version:1.1
// @webSite:https://www.aiduanju.cc
// @remark:爱短剧完整功能（电视剧/电影/短剧）
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
  
  // 分类视频列表元素 - 更新为更简单的选择器
  videoListLiTag: {
    name: 'li',
    class: 'fed-list-item'
  },
  
  // 视频图片元素 - 更新为更简单的选择器
  vImageTag: {
    name: 'a',
    class: 'fed-list-pics'
  },
  
  // 视频名称元素 - 更新为更简单的选择器
  vNameTag: {
    name: 'a',
    class: 'fed-list-title'
  },
  
  // 播放线路列表
  playFromTag: {
    name: 'ul',
    class: 'fed-part-rows'
  },
  
  // 剧集元素
  episodeItemTag: {
    name: 'a',
    class: 'fed-btns-info'
  },
  
  // 搜索链接
  searchUrl: '@{webSite}/vodsearch/@{searchWord}------------@{page}---.html',
  
  // 搜索结果列表元素
  searchListTag: {
    name: 'li',
    class: 'fed-list-item'
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
    var page = args.page || 1;
    var url = appConfig.mainListUrl
      .replace('@{webSite}', appConfig.webSite)
      .replace('@{mainId}', args.url)
      .replace('@{page}', page);
    
    console.log('请求URL:', url); // 调试日志
    
    // 获取数据
    var respData = await req(url, {
      headers: appConfig.headers
    });
    
    console.log('响应状态:', respData.status); // 调试日志
    
    var htmlStr = respData.data || '';
    var $ = cheerio.load(htmlStr);
    
    // 解析视频列表
    var videoList = parseVideoList($);
    console.log('解析到视频数量:', videoList.length); // 调试日志
    backData.data = videoList;
  } catch (error) {
    console.error('获取视频列表错误:', error); // 调试日志
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
    console.log('详情页URL:', url); // 调试日志
    
    var respData = await req(url, {
      headers: appConfig.headers
    });
    
    var htmlStr = respData.data || '';
    var $ = cheerio.load(htmlStr);
    
    // 解析播放列表
    var playFromSelector = appConfig.playFromTag.name + '.' + appConfig.playFromTag.class.replace(/\s+/g, '.');
    var playFromHtmlList = $(playFromSelector);
    
    console.log('找到播放线路:', playFromHtmlList.length); // 调试日志
    
    var playUrl = '';
    for (var i = 0; i < playFromHtmlList.length; i++) {
      var element = playFromHtmlList[i];
      var episodeSelector = appConfig.episodeItemTag.name + '.' + appConfig.episodeItemTag.class.replace(/\s+/g, '.');
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
    console.error('获取详情错误:', error); // 调试日志
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
    console.log('播放地址URL:', url); // 调试日志
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
    
    console.log('搜索URL:', url); // 调试日志
    
    // 获取搜索结果
    var respData = await req(url, {
      headers: appConfig.headers
    });
    
    var htmlStr = respData.data || '';
    var $ = cheerio.load(htmlStr);
    
    // 解析搜索结果
    var videoList = parseVideoList($);
    console.log('搜索到视频数量:', videoList.length); // 调试日志
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
  
  // 简化选择器，只匹配关键类名
  var selector = appConfig.videoListLiTag.name + '.' + appConfig.videoListLiTag.class;
  var videoItems = $(selector);
  
  console.log('找到列表项:', videoItems.length); // 调试日志
  
  for (var index = 0; index < videoItems.length; index++) {
    var element = videoItems[index];
    var $element = $(element);
    
    // 解析图片 - 使用更通用的选择器
    var imageSelector = appConfig.vImageTag.name + '.' + appConfig.vImageTag.class;
    var imageElement = $element.find(imageSelector);
    var imageUrl = parseImage(imageElement);
    
    // 解析名称 - 使用更通用的选择器
    var nameSelector = appConfig.vNameTag.name + '.' + appConfig.vNameTag.class;
    var nameElement = $element.find(nameSelector);
    var name = nameElement.text().trim();
    
    // 解析详情页链接
    var href = imageElement.attr('href') || nameElement.attr('href') || $element.find('a').attr('href') || '';
    
    if (name && href) {
      list.push({
        vod_pic: imageUrl,
        vod_name: name,
        vod_id: removeDomain(href)
      });
    }
  }
  
  return list;
}

/**
 * 组合完整URL
 */
function combineUrl(url) {
  if (!url) return '';
  
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
  
  // 优先获取data-original（懒加载）
  var dataOriginal = imageHtml.attr('data-original');
  if (dataOriginal) {
    if (dataOriginal.indexOf('http') !== 0 && dataOriginal.startsWith('//')) {
      return 'https:' + dataOriginal;
    }
    return dataOriginal;
  }
  
  // 其次获取src
  var src = imageHtml.attr('src');
  if (src) {
    if (src.indexOf('http') !== 0 && src.startsWith('//')) {
      return 'https:' + src;
    }
    return src;
  }
  
  // 尝试获取img标签
  var img = imageHtml.find('img');
  if (img.length > 0) {
    return parseImage(img);
  }
  
  return '';
}

// ================ 其他必要函数 ================ //

async function getSubclassList(args) {
  var backData = new RepVideoSubclassList();
  return JSON.stringify(backData);
}

async function getSubclassVideoList(args) {
  var backData = new RepVideoList();
  return JSON.stringify(backData);
}
