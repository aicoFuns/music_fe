/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/Home';
import { name as appName } from './app.json';
import TrackPlayer from 'react-native-track-player';
import logUtil from './src/utils/LogUtil';

AppRegistry.registerComponent(appName, () => App);

TrackPlayer.registerPlaybackService(() => require('./service'));

global.Promise = require('promise');
require('promise/lib/rejection-tracking').enable({
  allRejections: true,
  onUnhandled: (id, error) => {
    if (error?.name === 'AxiosError') {
      console.log('未处理的Promise异常，AxiosError已经单独处理，忽略');
      return;
    }
    logUtil.error(`未处理的Promise异常，id：${id} error：${error}`);
  },
});

// 捕获未处理的 JS 错误
ErrorUtils.setGlobalHandler((error, isFatal) => {
  const stack = error.stack || ''; // 获取错误的堆栈信息
  const match = stack.match(/:\d+:\d+/); // 解析错误发生的行号:列号

  let errorLocation = '';
  if (match) {
    errorLocation = match[0]; // 例如 ":123:45"
  }

  const errorMessage =
    `错误信息: ${error.message}\n` +
    `是否致命: ${isFatal}\n` +
    `错误位置: ${errorLocation}\n` +
    `堆栈信息: ${stack}`;
  logUtil.error(errorMessage);
});
