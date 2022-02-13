
import csv from 'csvtojson';
import { writeFileSync } from 'fs';
import axios from 'axios';
import {checker} from './checker.mjs';
import { timeout_ffprobe, timeout_get_m3u8, channelFilter } from './config.mjs';

// Run the pipeline

async function mock_checkChannel(csvLine, num){

    let channels = ['ch01','ch02','ch03']

    return { channel:channels[num%channels.length], group:'group', source:'source', link:'http://demo.com', width: 1024, height: 768, delay: Math.random() * 1000, displayRadio:'16:9' };
}

export async function checkChannel(csvLine, num) {
    const checkerConfig = {
        userAgent: null,
        timeout: timeout_ffprobe,
        debug:true
    }

    let channel = csvLine.Channel;
    let group = csvLine.Group;
    let source = csvLine.Source;
    let link = csvLine.Link;


    let getTest = await axios.get(link, { timeout: timeout_get_m3u8 });
    if (getTest.status == 200) {
        let item = { url: link, http: {} };
        let timeBegin = new Date();
        let checkResult = await checker(item, checkerConfig);
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
                        if (/bt2020/i.test(v.color_space)) {
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


function filterChannel(channel){
    let okChannel = channelFilter.channel.every((v,i)=>{
        return !v.test(channel.Channel)
    })
    if(!okChannel){
        return false;
    }
    let okGroup = channelFilter.group.every((v,i)=>{
        return !v.test(channel.Group);
    })
    if(!okGroup){
        return false;
    }

    return true;
}

export async function genChannelJson(csvFile = 'data.csv', saveToDisk = true)  {
    let csvDatas = await csv().fromFile('data.csv');

    
    let datas = csvDatas.filter(filterChannel);

    let channels = [];
    for (let i = 0; i < datas.length; ++i) {
    //for (let i = 0; i < 10; ++i) {
        let data = datas[i];

        try {
           // let channelInfo = await mock_checkChannel(data,i);// await checkChannel(data, i);
            let channelInfo = await checkChannel(data, i);

            if (channelInfo) {
                //添加 图标
                //#EXTINF:-1 tvg-id="1" tvg-name="CCTV1" tvg-logo="http://epg.51zmt.top:8000/tb1/CCTV/CCTV1.png" group-title="央视",CCTV-1
                // http://otttv.bj.chinamobile.com/TVOD/88888888/224/3221226432/1.m3u8
                // channelInfo.logo = getLogo(channelInfo.channel);
                channelInfo.groupTitle = '央视';

                
 

                
                console.log('ok', channelInfo.channel, channelInfo.link);
                channels.push(channelInfo);
            }
            else{
                console.warn('skip ', data);
            }


        } catch (e) {
            console.error('skip ', data, e.message);
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


    // console.log(channelsMap);
    if(saveToDisk)
        writeFileSync('./dist/all.json', JSON.stringify(channelsMap), {encoding:'utf8'});


    return channelsMap;
    // //生产m3u
    // const playlist = new M3uPlaylist();
    // playlist.title = '老牛之家';
    
    // Object.keys(channelsMap).forEach((k,chid)=>{
    //     let channel = channelsMap[k];
    //     channel.top.forEach((ch,sourceid)=>{
    //         const media = new M3uMedia(ch.link);
    //         media.attributes = {'tvg-id': (chid + 1).toString() , 'tvg-language': 'CN','tvg-logo': ch.logo};
    //         media.duration = -1;
    //         media.name = `${ch.channel}(${ch.source})`;
    //         media.group = groupTitle[ch.group] || '未分类';
            
    //         playlist.medias.push(media);
    //     });
    // })


    // const m3uString = playlist.getM3uString();

    // console.log(m3uString);

    // writeFileSync('./dist/all.m3u', m3uString, {encoding:'utf8'});

    // //上传到gitee 

    // execSync(`git pull`);
    // execSync(`git add -A`);
    // execSync(`git commit -m 'update my nas job'`);
    // execSync(`git push`);

    // //发布
    // await gitee_login_with_obj_cookie();

    // await pagebuild_with_obj_cookie();
}

