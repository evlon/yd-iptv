
import { M3uPlaylist, M3uMedia, M3uAttributes, M3uGenerator } from 'm3u-parser-generator';
import { writeFileSync } from 'fs';
import * as config from './config.mjs';
// Run the pipeline

//hook M3uGenerator to allow muli group
M3uGenerator.getAttributes = (attributes)=>{
    return Object.keys(attributes).map(key =>{ 
        if(Array.isArray(attributes[key])){
            return attributes[key].map(v=>`${key}="${v}"`).join(' ');
        }
        else{
           return  `${key}="${attributes[key]}"`;
        }
    }).join(' ');
}

// class MuliGroupM3uPlaylist extends M3uPlaylist {
//     constructor(){
//         super();
//     }

//     getM3uString() {
//         return m3u_generator_1.M3uGenerator.generate(this);
//     }
// }

function getLogo(channelInfo) {
    if(channelInfo.group == 'cctv'){
        let channel = channelInfo.channel;
        let match  = /CCTV-(\d+\+?)/i.exec(channel);
        if(match){
            return `http://epg.51zmt.top:8000/tb1/CCTV/CCTV${match[1]}.png`
        }
        return '';
    }
    
}

function getTvgName(channelInfo){
    if(channelInfo.group == 'cctv'){
        let channel = channelInfo.channel;
        let match  = /CCTV-(\d+\+?)/i.exec(channel);
        if(match){
            return `CCTV${match[1]}`
        }
        return '';
    }
    else if(channelInfo.group == "weishi"){
        return channelInfo.channel;
    }
    else if(channelInfo.group == "difang"){
        return '';
    }
    return channelInfo.channel;
}

export async function m3uGen(channelsMap = {channels:[{ channel:channels[num%channels.length], group:'group', source:'source', link:'http://demo.com', width: 1024, height: 768, delay: Math.random() * 1000, displayRadio:'16:9' }]}, saveToDisk = true) {

    Object.keys(channelsMap).forEach(k=>{
        let channel = channelsMap[k];
        channel.top = channel.channels.map(channelInfo=>{
            if(channelInfo.width <=360){
                channelInfo.definition = 0;
            }
            else 
            if(channelInfo.width <=540){
                channelInfo.definition = 1;
            }
            else 
            if(channelInfo.width <=720){
                channelInfo.definition = 2;
            }
            else 
            if(channelInfo.width <=1080){
                channelInfo.definition = 3;
            }
            else {
                channelInfo.definition = 4;
            }

            channelInfo.logo = getLogo(channelInfo);

            channelInfo.tvgName = getTvgName(channelInfo);
            
            return channelInfo;
        }).map(ch=>{
            let definitionPoints = [900,200,0,700,900]; //越小越好
            let point = definitionPoints[ch.definition];
            ch.sortPoint = point + ch.delay; 
            return ch;
        }).sort((l,r)=>l.sortPoint - r.sortPoint).slice(0,3)
    })

    // console.log(channelsMap);
    // writeFileSync('./dist/all.json', JSON.stringify(channelsMap), {encoding:'utf8'});

    //生产m3u
    const playlist = new M3uPlaylist();
    playlist.title = config.playlistTitle;
    
    Object.keys(channelsMap).forEach((k,chid)=>{
        let channel = channelsMap[k];
        channel.top.forEach((ch,sourceid)=>{
            const media = new M3uMedia(ch.link);

            let titleGroups = [config.groupTitle[ch.group] || '未分类', config.definitionTitle[ch.definition]];
            if(sourceid == 0){
                if(ch.definition <= 2){
                    titleGroups.push('老电视专用');
                }
                else{
                    titleGroups.push('大屏电视');
                }
            }
            media.attributes = {'tvg-id': (chid + 1).toString() , 'tvg-name':ch.tvgName, 'group-title': titleGroups, 'tvg-language': 'CN'};
            if(ch.logo){
                media.attributes['tvg-logo'] = ch.logo;
            }
            media.duration = -1;
            media.name = `${ch.channel}-${config.definitionTitle[ch.definition]}-${ch.width}X${ch.height}`;
            // media.group = groupTitle[ch.group] || '未分类';
            
            
            playlist.medias.push(media);
        });
    })


    const m3uString = playlist.getM3uString();


    writeFileSync('./dist/all.m3u', m3uString, {encoding:'utf8'});

    return m3uString;

}


