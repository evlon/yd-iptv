// import IPTVChecker  = require('iptv-checker')
let IPTVChecker = null;
const IPTVCheckerLoader = import('iptv-checker');


export async function checker(/*{url,http}*/item, /* IPTVChecker config*/ config) {
  let IPTVChecker = (await IPTVCheckerLoader).default;

  const ic = new IPTVChecker(config)
  const result = await ic.checkStream({ url: item.url, http: item.http })

  return {
    ok: result.status.ok,
    _id: item._id,
    url: item.url,
    http: item.http,
    error: !result.status.ok ? result.status.reason : null,
    streams: result.status.ok ? result.status.metadata.streams : [],
    requests: result.status.ok ? result.status.metadata.requests : []
  }
}