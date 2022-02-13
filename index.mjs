

import { m3uGen } from './m3u-generator.mjs';
import {gitPushToServer} from './git-push-to-server.mjs'
import { genChannelJson } from './channel-json.mjs';
// Run the pipeline


async function main() {

    let csvFile = "./data.csv";

    let channelsMap = await genChannelJson(csvFile,true)

    const m3uString = m3uGen(channelsMap,true);

    console.log(m3uString);
    //上传到gitee 
    await gitPushToServer();    
}

main().catch(e => {
    console.error(e);
});

