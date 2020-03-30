# mp-ar-bird

基于 tensorflow 的 AR 脸部追踪小游戏。

## 运行

1. 安装 npm
2. 执行以下命令

```
 $ npm install
```

3. 微信开发者工具导入项目，用你的小程序 appId 替代 project.config.json 中的 appid.
4. 点击微信开发工具中的“npm 构建”菜单。
5. 在你的小程序管理员界面里加入 tfjs-wechat plugin, 你可以搜索 tensorflow.js 或者 wx6afed118d9e81df9。
6. 将 models 文件夹里面的 model.json 和 group1-shard1of1 放至自己服务器，并替换 models/posenet/classifier.js 文件里面的连接。
7. 将 你的服务器地址 加入到你的小程序 request 合法域名列表中。

## 注

由于这个 Demo 上不了线，小程序审核不过（类目不符），小游戏不支持插件

认识我的朋友可以直接找我要个体验码
