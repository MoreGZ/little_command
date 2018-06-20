const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");

const resultDir = __dirname + '/result';
const resultFileName = resultDir+`/result.txt`;
const listDir = __dirname + "/links";
const listFile = listDir + "/linkList.csv"
const baseUrl = 'https://www.baidu.com/s?wd=';


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
    let fileContent = fs.readFileSync(filename,"utf-8");
    // console.log(fileContent);
    let contentList = fileContent.split('\n');
    let linkList = contentList.map(function(item){
        let arr = item.split(" ");
        let link = arr[arr.length-1];
        let p = /\\/g;
        if(p.test(link)){
            link = link.replace(p,'');
            console.log(link)
        }
        return link
    })
    linkList.splice(0,1)
    return linkList;
}

const sleep = (sleepTime) => {
    return new Promise(function(resolve){
        let t = setTimeout(() => {
            resolve();
        }, sleepTime);
    })
}

const requestPage = async function(page){
    const linklist = readLinkList(listFile);
    const config = require('./config.json');

    for(let i = config.nextIndex; i < linklist.length; i++){
        console.log(`start to go to ${linklist[i]}`)
        await page.goto(baseUrl+linklist[i]);
        const content = await page.content();
    
        const $ = cheerio.load(content, { decodeEntities: false });
        let numText = $("#container").find('.head_nums_cont_inner .nums_text').text();
        let patten = /约(.*?)个/
        console.log(numText)
        let num = str2Num(patten.exec(numText)[1]);
        console.log(`${linklist[i]}： ${num} \n`)

        let isInclude = num !== 0 ? 1 : 0;
        let contentString = linklist[i] + " " + isInclude + "\n"; 
        fs.appendFileSync(resultFileName,contentString);

        // 记录爬到了哪个链接
        config.nextIndex = i + 1;
        fs.writeFileSync('./config.json',JSON.stringify(config))
    }
}

const main = async () => {
    const browser = await puppeteer.launch({
        executablePath:'/Applications/Chromium.app/Contents/MacOS/Chromium'
    });
    const page = await browser.newPage();
    
    try{
        await requestPage(page);
    }catch(err){
        // 捕捉到异常
        console.log(err.message);
        // 关闭浏览器
        await browser.close();
        // 睡眠5s
        await sleep(5000);
        // 递归执行一次main
        await main();
    }

    await browser.close();
};


main();

