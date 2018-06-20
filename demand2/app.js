const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const resultDir = __dirname + '/result';
const sourceDir = __dirname + "/urlLists";
const recordDir = __dirname + "/record";

const sort = function(a, b) {
    
}

const filter = function(filename){
    let fileDir = sourceDir+"/"+filename;

    let fileContent = fs.readFileSync(fileDir,"utf-8");

    let contentList = fileContent.split('\n');
    let content = [];
    for(let i=0; i<contentList.length; i++){
        
        if(contentList[i] == "url"){
            continue;
        }

        if(contentList[i].substring(0,3) === "url"){
            continue;
        }
        
        let petten = /\\/g;
        if(petten.test(contentList[i])){
            continue;
        }

        petten = /\/search\//g;
        if(petten.test(contentList[i])){
            continue;
        }

        petten = /%/
        if(petten.test(contentList[i])){
            continue;
        }

        let p = /\\/g;
        if(p.test(contentList[i])){
            continue;
        }

        content += contentList[i] + "\n";
    }

    let fileBaseName = filename.split('.')[0];
    let filtedSourceFileDir = `${recordDir}/${fileBaseName}/${fileBaseName}.filte.csv`;
    fs.writeFileSync(filtedSourceFileDir, content);
    
    return filtedSourceFileDir;
}

const str2Num = function(numStr) {
    console.log(numStr);
    let numStrArr = numStr.split(','), 
        sum = 0;
    for(let i = numStrArr.length - 1, multiple = 1; i>=0; i--) {
        let num = parseInt(numStrArr[i]) * multiple;
        sum += num;
        multiple = multiple*1000
    }
    return sum;
}

const readLinkList = function(filename){
    let fileContent = fs.readFileSync(filename,"utf-8").trim();
    // console.log(fileContent);
    let contentList = fileContent.split('\n');
    return contentList;
}

const requestPage = async function(page,link){
    const baseUrl = 'https://www.baidu.com/s?wd=';
    console.log(`search${baseUrl+link}`)
    await page.goto(baseUrl+link);
    const content = await page.content();

    const $ = cheerio.load(content, { decodeEntities: false });
    let numText = $("#container").find('.head_nums_cont_inner .nums_text').text();
    let patten = /约(.*?)个/
    console.log(numText)
    let num = str2Num(patten.exec(numText)[1]);
    console.log(`${link}： ${num} \n`)

    let isInclude = num !== 0 ? 1 : 0;
    let contentString = link + " " + isInclude + "\n"; 

    return contentString;
}

const requestLinkList = async function(linklist, index, page, filename, callback){
    let fileBaseName = filename.split('.')[0];
    const record = require(`${recordDir}/${fileBaseName}/records/record${index}.json`)
    const nextIndex = record.nextIndex;

    try{
        for(let key = nextIndex; key < linklist.length; key++) {
            let contentString = await requestPage(page, linklist[key]);
            fs.appendFileSync(`${recordDir}/${fileBaseName}/results/${fileBaseName}${index}.txt`, contentString);

            record.nextIndex++;
            fs.writeFileSync(`${recordDir}/${fileBaseName}/records/record${index}.json`, JSON.stringify(record));
        }
        
        console.log(`finished requesting linklist${index}`)

        callback();
    }catch(err){
        console.log(err.message);

        await sleep(9000);

        requestLinkList(linklist, index, page, filename, callback);
    }
}

const sleep = (sleepTime) => {
    return new Promise(function(resolve){
        let t = setTimeout(() => {
            resolve();
        }, sleepTime);
    })
}

const splitLinkList = (linkList, n) => {
    let count = parseInt(linkList.length/n),
        linkLists = [];
    linkLists[0] = [];
    for(let i = 0, j = 0; i < linkList.length; i++){
        if((i%count) === 0 && i !== 0){
            j++;
            linkLists[j] = [];
        }
        linkLists[j].push(linkList[i]);
    }
    return linkLists;
}

const init = (filename, complicateCount) => {
    console.log("开始初始化操作");

    // 创建record文件
    let fileBaseName = filename.split('.')[0];
    fs.mkdirSync(`${recordDir}/${fileBaseName}`);
    fs.mkdirSync(`${recordDir}/${fileBaseName}/urlLists`);
    fs.mkdirSync(`${recordDir}/${fileBaseName}/results`);
    fs.mkdirSync(`${recordDir}/${fileBaseName}/records`);

    // 过滤列表中非法和没用url
    let filtedSourceFileDir = filter(filename);

    // 获取列表
    const allLinkList = readLinkList(filtedSourceFileDir);

    // 拆分为n个列表
    const linklists = splitLinkList(allLinkList, complicateCount);

    let record = {
        nextIndex: 0
    }
    linklists.forEach((linklist,index) => {
        let linkListContent = '';
        linklist.forEach((link) => {
            linkListContent += link + "\n";
        })
        fs.writeFileSync(`${recordDir}/${fileBaseName}/urlLists/${fileBaseName}${index}.csv`,linkListContent);
        fs.writeFileSync(`${recordDir}/${fileBaseName}/records/record${index}.json`,JSON.stringify(record));
    })

    console.log("完成初始化操作");

    return linklists;
}

const readRecord = (filename) => {
    console.log("开始读取存档");

    let fileBaseName = filename.split('.')[0];
    let linkLists = [];
    
    // 对文件列表进行排序
    let fileList = fs.readdirSync(`${recordDir}/${fileBaseName}/urlLists`)
        .sort(function(a,b){
            let patten = new RegExp(fileBaseName+"(.*?).csv")
            let num1 = parseInt(patten.exec(a)[1]);
            let num2 = parseInt(patten.exec(b)[1])
            return num1 - num2
        });
    fileList.forEach((item) => {
        let fileDir = `${recordDir}/${fileBaseName}/urlLists/${item}`
        let linkList = readLinkList(fileDir); 
        linkLists.push(linkList);
    })

    console.log("读取存档完成");
    return linkLists;
}

const mergeResult = (filename) => {
    console.log("开始合并结果")

    let fileBaseName = filename.split('.')[0];
    let linkLists = [];

    // 读取所有的result分支
    let fileList = fs.readdirSync(`${recordDir}/${fileBaseName}/results`)
        .sort(function(a,b){
            let patten = new RegExp(fileBaseName+"(.*?).txt")
            let num1 = parseInt(patten.exec(a)[1]);
            let num2 = parseInt(patten.exec(b)[1])
            return num1 - num2
        });
    fileList.forEach((item) => {
        let fileDir = `${recordDir}/${fileBaseName}/results/${item}`
        let linkList = readLinkList(fileDir); 
        linkLists.push(linkList);
    })

    // 合并所有的result分支
    let resultFileContent = "";
    linkLists.forEach((linkList) => {
        linkList.forEach((link) => {
            resultFileContent += link + "\n";
        })
    })

    // 将最后的结果写到result文件夹里面
    fs.writeFileSync(`${resultDir}/${fileBaseName}.result.txt`, resultFileContent);
    console.log("完成合并结果")
    
}

const main = async (filename, complicateCount) => {
    let linkLists = [];
    let sourceFileDir =  `${sourceDir}/${filename}`;
    // 判断之前是否有记录
    let recordFile = `${recordDir}/${filename.split('.')[0]}/records/record0.json`;
    if(!fs.existsSync(recordFile)){
        console.log("没有相关存档");

        // 初始化
        linkLists = init(filename, complicateCount);
    }else{
        console.log("已经有相关存档")

        // 读取之前的记录
        linkLists = readRecord(filename);
    }


    
    // 打开浏览器
    console.log("开启浏览器");
    const browser = await puppeteer.launch({
        executablePath:'/Applications/Chromium.app/Contents/MacOS/Chromium'
    });
    let pageCount = linkLists.length;
    let pageInRequestingCount = pageCount;
    let pages = [];
    for(let i=0; i < pageCount; i++){
        pages[i] = await browser.newPage();
    }

    // 开启并发访问
    linkLists.forEach(async (linklist,index) => {
        console.log('open page' + index);
        requestLinkList(linklist, index, pages[index], filename, () => {
            // 每档一个页面跑完的时候执行这个回调
            pageInRequestingCount--;
            // 当所有的list都跑完时关闭浏览器，将结果合并
            if(pageInRequestingCount <= 0){
                browser.close();
                // 合并结果
                mergeResult(filename);
            }
        });
    });
};


main("urlList1.csv", 15);
