import dayjs from 'dayjs';
import { isEmpty, update } from 'lodash';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import ToastUtil from './ToastUtil';
import logUtil from './LogUtil';
import useDownloadListStore from '../global/useDownloadListStore';
import downloadCore from '../downloadCore';
import apiClient from './ApiClient';
import { AppState } from 'react-native';

const isAppInForeground = () => AppState.currentState === 'active';

const wyyLevelDescs = [
  '高品质',
  '无损',
  //'高清臻音', // 这个疑似没用
  '沉浸环绕声',
  //'臻音全景声', // 这个不支持在线试听
  //'超清母带',
];
const wyyLevelCodes = [
  'exhigh',
  'lossless',
  //'hires',
  'sky',
  //'jyeffect',
  //'jymaster',
];
const qqLevelDescs = [
  '高品质',
  '无损',
  //'高清臻音', // 这个疑似没用
  //'臻品音质',
  //'臻音全景声', // 这个不支持在线试听
  '臻品全景声', // 这个不支持在线试听
];
const qqLevelCodes = [
  '320',
  'flac',
  //'hires',
  //'atmos_2',
  //'jyeffect',
  //'jymaster',
  'atmos_51',
];

const MyUtils = {
  getSoundBookmarkSuccess: async () => {
    const result = await apiClient.get(
      '/utils/user-action/count/day?action=SOUND-ALBUM-BOOKMARK',
    );
    return result.data.result;
  },

  getSoundBookmarkLimt: async () => {
    const result = await apiClient.get('/utils/bookmark-soundalbum/limit');
    return result.data.result;
  },

  getSoundCacheSuccess: async () => {
    const result = await apiClient.get(
      '/utils/user-action/count/day?action=SOUND-CACHE',
    );
    return result.data.result;
  },

  getSoundCacheLimt: async () => {
    const result = await apiClient.get('/utils/sound-cache/limit');
    return result.data.result;
  },

  getWyyLevelDescs: (): string[] => {
    return wyyLevelDescs;
  },
  getWyyLevelCodes: (): string[] => {
    return wyyLevelCodes;
  },
  getWyyLevelIndex: (levelCode: string): number => {
    // 有个特殊情况，网易云有些音乐连高品质都没有
    if (levelCode === 'standard') {
      return 0;
    }
    return wyyLevelCodes.findIndex(item => item === levelCode);
  },
  getQQLevelDescs: (): string[] => {
    return qqLevelDescs;
  },
  getQQLevelCodes: (): string[] => {
    return qqLevelCodes;
  },
  getQQLevelIndex: (levelCode: string): number => {
    return qqLevelCodes.findIndex(item => item === levelCode);
  },

  formatDate: (obj: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss') => {
    return dayjs(obj).format(format);
  },
  formatDateCN: (
    obj: Date | string,
    format: string = 'YY年MM月DD日 HH点mm分',
  ) => {
    return dayjs(obj).format(format);
  },

  buildPlatformImg: (platform: string, valid: boolean = true) => {
    if (platform === 'QQ') {
      return valid
        ? require('../assets/images/qq.png')
        : require('../assets/images/qq-invalid.png');
    } else if (platform === 'WYY') {
      return valid
        ? require('../assets/images/wyy.png')
        : require('../assets/images/wyy-invalid.png');
    } else if (platform === 'XMLY') {
      return require('../assets/images/xmly.png');
    }
    logUtil.error(`不支持该platform:${platform}`, 'SYSTEM');
    return null;
    //throw new Error(`不支持该platform:${platform}`);
  },

  buildPlayListImg: (playListImg: string, playListType: string) => {
    if (!isEmpty(playListImg)) {
      return { uri: playListImg };
    }
    if (playListType === 'FAVORITE') {
      return require('../assets/images/heart.playlist.png');
    }
    return require('../assets/images/default.playlist.png');
  },

  formatPlayerTime: seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },
  handleAsync: async <T>(
    promise: Promise<T>,
    callback: (error: any) => void = error => {},
  ): Promise<any> => {
    try {
      return await promise;
    } catch (error) {
      console.error('Error occurred:', error);
      // 调用回调函数
      callback(error);

      return error;
    }
  },
  checkFileExists: checkFileExists,

  getFilePath: (fileName: string) => {
    return RNFS.DownloadDirectoryPath + '/' + fileName + '.mp3';
  },

  getDownloadPath: () => {
    return RNFS.DownloadDirectoryPath;
  },
  saveLyrics: async (lyrics: string, filename: string = 'lyrics.lrc') => {
    const path = `${RNFS.DownloadDirectoryPath}/${filename}`;

    await RNFS.writeFile(path + '-high.lrc', lyrics, 'utf8');
    await RNFS.writeFile(path + '-no-loss.lrc', lyrics, 'utf8');
    await RNFS.writeFile(path + '-surround.lrc', lyrics, 'utf8');
    return path;
  },

  downLoadFile: async (
    fileUrl: string,
    fileName: string,
    fileSuffix: FileSuffixType,
    updateProgressAndCount = false,
  ): Promise<any> => {
    console.log(
      `fileUrl:${fileUrl} fileName:${fileName} fileSuffix:${fileSuffix}`,
    );
    // if (await checkFileExists(fileName)) {
    //   console.log(`该歌曲：${fileName}已存在于本地磁盘，无需重复下载~`);
    //   return true;
    // }
    if (!(await checkStoragePermission())) {
      const userAuthed = await requestStoragePermission();
      if (!userAuthed) {
        logUtil.info('用户没有授予下载权限，下载失败了', 'DOWNLOAD');
        ToastUtil.showErrorToast('未授权存储权限，下载失败~');
        return false;
      }
    }
    const downloadDest =
      RNFS.DownloadDirectoryPath + '/' + fileName + '-' + fileSuffix;

    try {
      const options = {
        fromUrl: fileUrl, // 下载的文件URL
        toFile: downloadDest, // 保存到本地的路径
        background: true, // 是否在后台下载
        progressDivider: 50, // 进度更新的间隔，单位是字节
        begin: res => {
          logUtil.info(
            `用户开始下载歌曲，fileName：${fileName} res：${JSON.stringify(
              res,
            )}`,
            'DOWNLOAD',
          );
        },
        progress: async res => {
          if (
            useDownloadListStore.getState().downloadQueueTaskStatus === 'Pause'
          ) {
            ToastUtil.showDefaultToast('已暂停');
            logUtil.info('用户暂停了下载');
            RNFS.stopDownload(res.jobId);
            await deleteFile(fileName, fileSuffix);
            await downloadCore.pauseDownload();
            throw new Error('用户手动停止下载');
          } else {
            if (updateProgressAndCount) {
              const progress = (res.bytesWritten / res.contentLength) * 100;
              useDownloadListStore
                .getState()
                .setCurrentDownloadProgress(`${progress.toFixed(2)}%`);
            }
          }
        },
      };

      const download = await RNFS.downloadFile(options);
      const result = await download.promise;

      if (result.statusCode === 200) {
        logUtil.info(
          `用户下载歌曲成功，文件名：${fileName}${fileSuffix}`,
          'DOWNLOAD',
        );
        if (updateProgressAndCount) {
          // 上传成功数据
          await apiClient.post('/utils/user-action', {
            action: 'DOWNLOAD-SUCCESS',
          });
        }

        return { success: true, path: downloadDest };
      } else {
        logUtil.info(
          `用户下载歌曲失败，文件名：${fileName} result：${JSON.stringify(
            result,
          )}`,
          'DOWNLOAD',
        );
        return { success: false, path: downloadDest };
      }
    } catch (error) {
      logUtil.error(
        `用户下载歌曲异常，文件名：${fileName} 异常原因：${JSON.stringify(
          error,
        )}`,
        'DOWNLOAD',
      );
      return { success: false, path: downloadDest };
    }
  },
  delay: delay,
  checkStoragePermission: checkStoragePermission,
};

async function delay(seconds: number, ignoreIfInBackground: boolean = true) {
  // 如果不在前台，则忽略
  if (!isAppInForeground() && ignoreIfInBackground) {
    logUtil.info(
      `当前App不在前台，并且ignoreIfInBackground=${ignoreIfInBackground}，所以本次延时会忽略~`,
    );
    return;
  }
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function checkStoragePermission() {
  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  return granted;
}

async function requestStoragePermission() {
  if (Platform.OS === 'android' && Platform.Version <= 28) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: '需要存储权限',
        message: '应用需要访问存储，以便下载文件。',
        buttonNeutral: '稍后再说',
        buttonNegative: '拒绝',
        buttonPositive: '允许',
      },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log('存储权限被拒绝');
      return false;
    }
  }
  return true;
}

async function checkFileExists(fileName: string) {
  try {
    const downloadDest = RNFS.DownloadDirectoryPath + '/' + fileName + '.mp3';
    const fileExists = await RNFS.exists(downloadDest); // 检查文件是否存在
    console.log(`返回fileExists：${fileExists} downloadDest:${downloadDest}`);
    return fileExists;
  } catch (error) {
    console.error('检查文件时出错:', error);
    return false; // 出现错误时返回文件不存在
  }
}

async function deleteFile(fileName: string, fileSuffix: FileSuffixType) {
  const targetFile =
    RNFS.DownloadDirectoryPath + '/' + fileName + '-' + fileSuffix;
  await RNFS.unlink(targetFile);
}

export default MyUtils;
