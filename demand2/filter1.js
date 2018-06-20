const fs = require('fs');
const nextIndex = require("./config.json").nextIndex;

const filename = __dirname + '/links/linkList.csv';

const filter = function(filename){
    let fileContent = fs.readFileSync(filename,"utf-8");
    let contentList = fileContent.split('\n');
    let content = [];
    for(let i=0; i<contentList.length; i++){

        petten = /%/
        if(!petten.test(contentList[i])){
            continue ;
        }

        content += contentList[i] + "\n";
    }
    fs.writeFileSync("./links/linkList.filter1.csv", content);
}

filter(filename);