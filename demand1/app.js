const https = require("https");
const cheerio = require("cheerio");
const fs = require("fs");

const config = require("./recode.json");

const mainUrl = 'https://cloud.tencent.com/document/product';
const dir = __dirname+'/data';
const filename = `result${config.version}.txt`;
const fileDir = dir+"/"+filename;

/**
 * 用途：主入口函数
 */
const main = async function() {
    // 获取mainUrl里面的product，solution，document的所有对应页面的url
    let mainHtml = await getHtml(mainUrl);
    let $ = cheerio.load(mainHtml),
        linkLists = [],
        LinklistsMap = [];
    LinklistsMap[0] = {};
    LinklistsMap[1] = {};
    LinklistsMap[2] = {};
    LinklistsMap[0].title = "产品"
    LinklistsMap[1].title = "解决方案"
    LinklistsMap[2].title = "文档"
    LinklistsMap[0].exec = ".J-mainContent,.body"
    LinklistsMap[1].exec = ".solution.solution-game"
    LinklistsMap[2].exec = ".J-mainContent"

    // 获取产品和解决方案的urlList
    $(".nav-dropdown-menu-all").map(function(index) {
        if(index>1) {return};

        let item = $(this);
        LinklistsMap[index].menu = [];
        item.find('.menu-area').each(function(subIndex) {
            let subItem = $(this);

            let o1 = {};
            o1.title = subItem.find('.menu-area-tit h3').text().trim();
            o1.menu = [];

            subItem.find('.menu-item-tit').each(function(subSubIndex){
                let subSubItem = $(this).html()
                let link = $(subSubItem)[1].attribs.href.trim("?");
                link = link.slice(0,5) === "https" ? link : "https://cloud.tencent.com" + link

                let o2 = {};
                o2.link = link;
                o2.text = $(subSubItem).text().trim();
                
                o1.menu.push(o2);
            })

            LinklistsMap[index].menu.push(o1);
        })
    })

    // 获取文档的urlList
    LinklistsMap[2].menu = [];
    $('.c-media-tit-list.J-media-list').find('.c-media-cell.J-category-cell').each(function() {
        let subItem = $(this);

        let o1 = {};
        o1.title = subItem.find('.c-media-cell-tit h2').text().trim();
        o1.menu = [];

        subItem.find('.c-media-cell-item h3').each(function(){
            let subSubItem = $(this).html()
            let link = $(subSubItem)[1].attribs.href.trim("?");
            link = link.slice(0,5) === "https" ? link : "https://cloud.tencent.com" + link
            let o2 = {};
            o2.link = link;
            o2.text = $(subSubItem).text().trim();
            
            o1.menu.push(o2);
        })

        LinklistsMap[2].menu.push(o1);
    })


    //获取文章html
        // 获取所有的link
    linkLists = linkMapToList(LinklistsMap);

    if(fs.exists(dir)){
        fs.mkdirSync(dir);
    }

        // 获取主要的html
    for(let key in linkLists) {
        let contentString = await getATags(linkLists[key].link, linkLists[key].exec);
        
        fs.appendFileSync(fileDir,contentString);
        if(key == 0){
            config.version++;
            fs.writeFileSync('recode.json', JSON.stringify(config));
        }
    }
}

/**
 * 用途：获取对应url的html
 * @url：网页的url
 * @return: 返回网页的html
 */
const getHtml = async function(url){
    let html = '';
    return new Promise(function(resolve, reject){
        https.get(url, function(res) {
            res.on('data', function(data) {
                html += data;
            })
        
            res.on('end', function() {
                resolve(html)
            })
        }).on("error", function(err) {
            reject(err);
        })
    })
}

/**
 * 用途：获取页面里面的a标签
 * @link：页面的链接
 * @exec：content区域的查询字符串
 * @return：当前页面的所有a标签的href和test
 */
const getATags = async (link, exec) => {
    console.log(`start requesting ${link}`)
    try{
        let html = await getHtml(link);
        console.log(`finish requesting ${link}`)
        
        let $ = cheerio.load(html,{decodeEntities: false})
        let $content = $(exec);
        let aTags = $content.find('a');
        let contentString = '';
        aTags.each(function(index){
            let $this = $(this);
            // 过滤带结构的a标签
            if($this.html().match(/<.*?>/)) return;

            let text = $this.text().trim();
            let link = $this.attr("href");

            // 过滤空链接，锚点链接
            if(link === "javascript:;" || link === undefined || link.slice(0,1)==='#' || !link) return;

            link = link.slice(0,4) === "http" ? link : 
                (   link.slice(0,19) == "//cloud.tencent.com" ? 
                    "https:" + link :
                    "https://cloud.tencent.com" + link
                )
            contentString += text+"  "+link+'\n';
        })
        console.log(`finish fetching a tag in ${link}`)
        return contentString;
    }catch(err){
        console.log(`${link} has error`);
        console.log(err.message);
        // throw(err);
    }
}

/**
 * 用途：讲链接的map导出成list
 */
const linkMapToList = (map) => {
    let list = [];
    map.forEach((item,index) => {
        item.menu.forEach((subItem, subIndex) => {
            subItem.menu.forEach((subSubItem) => {
                list.push({
                    link: subSubItem.link,
                    exec: item.exec
                });
            })
        })
    })

    return list;
}

main();