const IPTVChecker = require('iptv-checker')

const checker = {}

checker.check = async function (/*{url,http}*/item, /* IPTVChecker config*/ config) {
  const ic = new IPTVChecker(config)
  const result = await ic.checkStream({ url: item.url, http: item.http })

  return {
    ok : result.status.ok,
    _id: item._id,
    url: item.url,
    http: item.http,
    error: !result.status.ok ? result.status.reason : null,
    streams: result.status.ok ? result.status.metadata.streams : [],
    requests: result.status.ok ? result.status.metadata.requests : []
  }
}

module.exports = checker