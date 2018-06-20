const fs = require('fs');
const nextIndex = require("./config.json").nextIndex;

const readLinkList = function(filename){
    let fileContent = fs.readFileSync(filename,"utf-8");
    let contentList = fileContent.split('\n');
    let linkList = contentList.map(function(item){
        let arr = item.split(" ");
        let link = arr[arr.length-1];
        if(link.slice(0,36) == "https://buy.cloud.tencent.com/domain"){
            link = 'https://buy.cloud.tencent.com/domain';
        }
        return link
    })
    linkList.splice(0,1)
    return linkList;
}

const main = function() {
    const linkList1 = readLinkList('./links/linkList.csv');
    let linkList2 = [];
    for(let i = nextIndex; i < linkList1.length; i++){
        fs.appendFileSync("./links/linkList2.csv", linkList1[i]+"\n");
    }
}

main();