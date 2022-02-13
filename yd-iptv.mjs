#!/usr/bin/env node
import { m3uGen } from './m3u-generator.mjs';
import { gitPushToServer } from './git-push-to-server.mjs'
import { genChannelJson } from './channel-json.mjs';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv'

// load env from .env file

dotenv.config();

import { program } from "commander";

// var program = new Command("yd-iptv.mjs");

program
    .name("yd-iptv")
    .description("my iptv generator")
    .version('0.1.0');

let channelsMap = null;


program.command("genjson")
    // .description('Split a string into substrings and display as an array')
    // .argument('<string>', 'string to split')
    // .option('--first', 'display just the first substring')
    // .option('-s, --separator <char>', 'separator character', ',')
    // .action((str, options) => {
    //   const limit = options.first ? 1 : undefined;
    //   console.log(str.split(options.separator, limit));
    // });
    .description("gen json from csv")
    .action(async () => {
        let csvFile = "./data.csv";

        channelsMap = await genChannelJson(csvFile, true)
    });

program.command("genm3u")
    .description("gen json from csv")
    .action(async () => {
        if (channelsMap === null) {
            let jsonFile = './dist/all.json';
            if (fs.existsSync(jsonFile)) {
                channelsMap = JSON.parse(fs.readFileSync(jsonFile, { encoding: 'utf8' }))
            }
            else {
                channelsMap = await genChannelJson(csvFile, true)
            }
        }

        let m3uString = await m3uGen(channelsMap);

        console.log(m3uString);
    });

program.command("gitpush")
    .description("gen json from csv")
    .action(async () => {
        //上传到gitee 
        execSync(`git pull`);
        execSync(`git add -A`);
        execSync(`git commit -m 'update my nas job'`);
        execSync(`git push`);

    });
program.command("publish")
    .description("publish web page [dist]")
    .action(async () => {
        //publish web page 
        //process.env.GITEE_DIRECTORY = path;
        await gitPushToServer();
    });

program.parse(process.argv);

