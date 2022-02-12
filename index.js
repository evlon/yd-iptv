
const csv = require('csvtojson')
const m3uGen = require('m3u-parser-generator');
const fs = require('fs');
const axios = require('axios').default
const itvpChecker = require('./checker')
const config = require('./config')
// Run the pipeline

async function mock_checkChannel(csvLine, num){

    let channels = ['ch01','ch02','ch03']

    return { channel:channels[num%channels.length], group:'group', source:'source', link:'http://demo.com', width: 1024, height: 768, delay: Math.random() * 1000, displayRadio:'16:9' };
}

async function checkChannel(csvLine, num) {
    const checkerConfig = {
        userAgent: null,
        timeout: 20000
    }

    let channel = csvLine.Channel;
    let group = csvLine.Group;
    let source = csvLine.Source;
    let link = csvLine.Link;


    let getTest = await axios.get(link, { timeout: 1500 });
    if (getTest.status == 200) {
        let item = { url: link, http: {} };
        let timeBegin = new Date();
        let checkResult = await itvpChecker.check(item, checkerConfig);
        let timeUse = new Date().valueOf() - timeBegin.valueOf();

        if (checkResult.ok) {
            let flagAudio = 0,
                flagVideo = 0,
                flagHDR = 0,
                flagHEVC = 0,
                vwidth = 0,
                vheight = 0,
                displayRadio = '16:9'

            checkResult.streams.forEach((v, i) => {
                displayRadio = v.display_aspect_ratio || '16:9';
                if (v.codec_type == "video") {
                    flagVideo = 1
                    if ('color_space' in v) {
                        //https://www.reddit.com/r/ffmpeg/comments/kjwxm9/how_to_detect_if_video_is_hdr_or_sdr_batch_script/
                        if ('bt2020' in v.color_space) {
                            flagHDR = 1
                        }
                    }

                    if (v.codec_name == 'hevc') {
                        flagHEVC = 1
                    }

                    if (vwidth < v.coded_width) {
                        vwidth = v.coded_width;
                        vheight = v.coded_height;
                    }
                }
                else if (v.codec_type == "audio") {
                    flagAudio = 1
                }
            });

            if (flagAudio == 0) {
                console.log(`[${num}] ${channel}(${source}) Error: Video Only!`)
                return false
            }
            if (flagVideo == 0) {
                console.log(`[${num}] ${channel}(${source}) Error: Audio Only!`)
                return false
            }

            if ((vwidth == 0) || (vheight == 0)) {
                console.log(`[${num}] ${channel}(${source}) Error: ${vwidth}x${vheight}`)
            }
            if (flagHDR == 0) {
                console.log(`[${num}] ${channel}(${source}) PASS: ${vwidth}x${vheight}`)
                return { channel, group, source, link, width: vwidth, height: vheight, delay: timeUse, displayRadio };
            }

            if (flagHDR == 1) {
                console.log(`[${num}] ${channel}(${source}) PASS(HDR Enabled): ${vwidth}x${vheight}`)
                return { channel, group, source, link, width: vwidth, height: vheight, hdr: true, delay: timeUse, displayRadio };

            }

            if (flagHEVC == 1) {// https://news.ycombinator.com/item?id=19389496  默认有HDR的算HEVC

                console.log(`[${num}] ${channel}(${source}) PASS(HEVC Enabled): ${vwidth}x${vheight}`)
                return { channel, group, source, link, width: vwidth, height: vheight, hevc: true, delay: timeUse, displayRadio };
            }
        }
        else {
            return false;
        }
    }
    else {
        console.log(`[${num}] ${channel}(${source}) Error: ${getTest.status} ${getTest.statusText}`)
        return false
    }


}

async function getLogo(channel) {
    return '';
}

function filterChannel(channel){
    let okChannel = config.channelFilter.channel.every((v,i)=>{
        return !v.test(channel.Channel)
    })
    if(!okChannel){
        return false;
    }
    let okGroup = config.channelFilter.group.every((v,i)=>{
        return !v.test(channel.Group);
    })
    if(!okGroup){
        return false;
    }

    return true;
}

async function main() {
    let csvDatas = await csv().fromFile('data.csv');

    let datas = csvDatas.filter(filterChannel);

    let channels = [];
    // for (let i = 0; i < datas.length; ++i) {
    for (let i = 0; i < 10; ++i) {
        let data = datas[i];

        try {
           // let channelInfo = await mock_checkChannel(data,i);// await checkChannel(data, i);
            let channelInfo = await checkChannel(data, i);

            if (channelInfo) {
                //添加 图标
                //#EXTINF:-1 tvg-id="1" tvg-name="CCTV1" tvg-logo="http://epg.51zmt.top:8000/tb1/CCTV/CCTV1.png" group-title="央视",CCTV-1
                // http://otttv.bj.chinamobile.com/TVOD/88888888/224/3221226432/1.m3u8
                channelInfo.logo = getLogo(channelInfo.channel);
                channelInfo.groupTitle = '央视';
            }

            // console.log(channelInfo);
            channels.push(channelInfo);

        } catch (e) {
            console.error('skip ', data, e);
        }
    }

    //确定每个channel 最快的3个， 
  
    let channelsMap = channels.reduce((map, v, i)=>{
        if(v.channel in map){
            map[v.channel].channels.push(v);
        }
        else{
            map[v.channel] = {channels:[v]}
        }

        return map;
    },{});


    console.log(channelsMap);

    Object.keys(channelsMap).forEach(k=>{
        let channel = channelsMap[k];
        channel.top = channel.channels.sort((l,r)=>l.delay - r.delay).slice(0,3)
    })

    console.log(channelsMap);

    //生产m3u
    const playlist = new m3uGen.M3uPlaylist();
    playlist.title = '老牛之家';
    
    Object.keys(channelsMap).forEach((k,chid)=>{
        let channel = channelsMap[k];
        channel.top.forEach((ch,sourceid)=>{
            const media = new m3uGen.M3uMedia(ch.link);
            media.attributes = {'tvg-id': (chid + 1).toString() , 'tvg-language': 'CN','tvg-logo': ch.logo};
            media.duration = -1;
            media.name = ch.channel;
            media.group = ch.group;
            
            playlist.medias.push(media);
        });
    })


    const m3uString = playlist.getM3uString();

    console.log(m3uString);

    fs.writeFileSync('./dist/all.m3u', m3uString, {encoding:'utf8'});
}



main().catch(e => {
    console.error(e);
});

