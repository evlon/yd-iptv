
# 说明
家里的移动宽带，机顶盒不好使，于是使用KODI作为NAS和电视直播的播放器。

直播列表感谢[前辈abc1763613206](https://github.com/abc1763613206/myiptv)提供，为方便自己的使用，作了如下的事情。

# 1.  针对老电视优化
家里的播放720P的就可以，于是添加了高清电视(720P),分组。
如果您是4K电视，也有“大屏电视”对应。

# 2. HOOK m3u-parser-generator 支持添加多个分组
 iptv-pro 测试通过， Kodi一会测试。

# 3. NAS作业测速排序，取最快的3个源
得来的电视来源太多了，只CCTV就好多，不方便，于是在在自己家里的NAS上跑脚本测速，取最快的3个，然后上次到GITEE，自动发布。

 

### 参考：install ffprobe on nas (importent  aarc64 is same to arm64)

[传送门 https://github.com/descriptinc/ffmpeg-ffprobe-static/releases/tag/b4.4.0-rc.11](https://github.com/descriptinc/ffmpeg-ffprobe-static/releases/tag/b4.4.0-rc.11)


### 引用的直播源
[https://github.com/abc1763613206/myiptv](https://github.com/abc1763613206/myiptv)