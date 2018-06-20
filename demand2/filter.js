const fs = require('fs');
const nextIndex = require("./config.json").nextIndex;

const filename = __dirname + '/links/linkList.csv';

const filter = function(filename){
    let fileContent = fs.readFileSync(filename,"utf-8");
    let contentList = fileContent.split('\n');
    let content = [];
    for(let i=0; i<contentList.length; i++){
        if(contentList[i] == "url"){
            continue;
        }

        let petten = /\\/g;
        if(petten.test(contentList[i])){
            continue;
        }

        petten = /\/search\//g;
        if(petten.test(contentList[i])){
            continue ;
        }

        petten = /%/
        if(petten.test(contentList[i])){
            continue ;
        }

        content += contentList[i] + "\n";
    }
    fs.writeFileSync("./links/linkList.filter.csv", content);
}

filter(filename);