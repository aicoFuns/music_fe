import React, { useState, useEffect, useReducer, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  colors,
  featureButtonNormal,
  fontSizes,
  iconSizes,
} from './Common.styles';
import MyUtils from './utils/MyUtils';
import Icon from 'react-native-vector-icons/FontAwesome6';
import SongList from './SongList';
import useDownloadListStore from './global/useDownloadListStore';
import ToastUtil from './utils/ToastUtil';
import { isEmpty } from 'lodash';
import downloadCore from './downloadCore';
import apiClient from './utils/ApiClient';

const DownloadList = ({ route, navigation }) => {
  const downloadList = useDownloadListStore(state => state.downLoadList);
  const downloadQueueStatus = useDownloadListStore(
    state => state.downloadQueueTaskStatus,
  );
  const hasMoreDownData = useRef(true);
  const [result, setResult] = useState(downloadList);
  const [downloadLimit, setDownloadLimit] = useState(0);
  const [downloadSuccessCnt, setDownloadSuccessCnt] = useState(0);

  const fetchDownloadConfig = async () => {
    setDownloadSuccessCnt(await downloadCore.downloadSuccessCnt());
    setDownloadLimit(await downloadCore.downloadLimit());
  };

  useEffect(() => {
    setResult(downloadList);
  }, [downloadList]);

  useEffect(() => {
    fetchDownloadConfig();
  });

  const showDownloadQueueStatus = () => {
    if (isEmpty(downloadList) || downloadQueueStatus === 'Done') {
      return false;
    }
    return true;
  };

  const getDownloadQueueStatusText = () => {
    if (
      downloadQueueStatus === null ||
      downloadQueueStatus === undefined ||
      downloadQueueStatus === 'Pause'
    ) {
      return '开始下载';
    }
    if (downloadQueueStatus === 'Downloading') {
      return '暂停下载';
    }
    if (downloadQueueStatus === 'Failed') {
      return '重试失败';
    }
  };

  const getDownloadQueueStatusIcon = () => {
    if (
      downloadQueueStatus === null ||
      downloadQueueStatus === undefined ||
      downloadQueueStatus === 'Pause'
    ) {
      return 'download';
    }
    if (downloadQueueStatus === 'Downloading') {
      return 'pause';
    }
    if (downloadQueueStatus === 'Failed') {
      return 'rotate-right';
    }
  };

  const handleDownloadTask = () => {
    if (isEmpty(downloadList)) {
      return;
    }

    // 到达当日限额，无法继续下载
    if (downloadSuccessCnt >= downloadLimit) {
      ToastUtil.showErrorToast('今天的下载额度已用完，请明天再试吧~');
      return;
    }

    const downloadState = useDownloadListStore.getState();
    // 下载中，需要暂停
    if (downloadQueueStatus === 'Downloading') {
      ToastUtil.showDefaultToast('暂停下载');
      downloadCore.pauseDownload();
    }
    // 暂停中，需要继续
    if (downloadQueueStatus === 'Pause') {
      ToastUtil.showDefaultToast('已开始下载');
      downloadCore.startDownload();
    }

    // 完成，但是有失败的，需要重置index为0，然后触发下载
    if (downloadQueueStatus === 'Failed') {
      ToastUtil.showDefaultToast('重试下载失败的歌曲');
      downloadState.retryAllFailedItems();
      const nextDownloadIndex = useDownloadListStore
        .getState()
        .downLoadList.findIndex(item => item.downloadStatus === 'WaitStart');
      if (nextDownloadIndex !== -1) {
        downloadState.setCurrentDownloadIndex(nextDownloadIndex);
        downloadCore.startDownload();
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* 提示文本 */}
      <Text style={styles.noteText}>
        {`资源有限，每日限额下载${downloadLimit}首，已下载${downloadSuccessCnt}首`}
      </Text>
      <Text style={styles.normalText}>
        {
          '下载音质取决于你在线播放的音质设置，请谨慎开启全景声或环绕音，文件大小参考，高品质约10MB，无损约30MB，全景声或环绕声约60MB~'
        }
      </Text>
      <Text
        style={
          styles.normalText
        }>{`下载目录：${MyUtils.getDownloadPath()}`}</Text>

      {/* 下载列表 */}
      <SongList
        renderScenario="downloadList"
        songItems={result}
        loadMoreData={() => {
          hasMoreDownData.current = false;
          setResult([...downloadList]);
        }}
        hasMoreUpData={false}
        hasMoreDownData={hasMoreDownData.current}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          marginVertical: 10,
        }}>
        {showDownloadQueueStatus() && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.bgBlue,
              paddingVertical: featureButtonNormal.paddingVertical,
              paddingHorizontal: featureButtonNormal.paddingHorizontal,
              borderRadius: featureButtonNormal.borderRadius,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
            onPress={handleDownloadTask}>
            <Text style={{ color: '#FFFFFF', fontSize: fontSizes.normal }}>
              {getDownloadQueueStatusText()}
            </Text>
            <Icon
              name={getDownloadQueueStatusIcon()}
              size={iconSizes.normal}
              color={colors.bgWhite}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{
            backgroundColor: colors.bgBlue,
            paddingVertical: featureButtonNormal.paddingVertical,
            paddingHorizontal: featureButtonNormal.paddingHorizontal,
            //marginHorizontal: 10,
            borderRadius: featureButtonNormal.borderRadius,
            alignItems: 'center',
            flexDirection: 'row',
          }}
          onPress={() => {
            useDownloadListStore.getState().setDownloadList([]);
            useDownloadListStore.getState().setCurrentDownloadIndex(0);
            useDownloadListStore.getState().setDownloadQueueTaskStatus('Done');
            ToastUtil.showDefaultToast('列表已清空');
          }}>
          <Text style={{ color: '#FFFFFF', fontSize: fontSizes.normal }}>
            清空列表
          </Text>
          <Icon
            name="xmark"
            size={iconSizes.normal}
            color={colors.bgWhite}
            style={{ marginLeft: 5 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'space-between',
    backgroundColor: colors.bgWhite,
  },
  normalText: {
    fontSize: fontSizes.small,
    color: colors.fontColorLightGray,
    paddingLeft: 20,
    paddingVertical: 5,
  },

  noteText: {
    fontSize: fontSizes.small,
    color: colors.fontColorRed,
    paddingLeft: 20,
    paddingVertical: 10,
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  songName: {
    fontSize: 16,
    flex: 1,
  },
  completed: {
    color: 'green',
    fontSize: 16,
  },
  progress: {
    color: 'orange',
    fontSize: 16,
  },
  pending: {
    color: 'gray',
    fontSize: 16,
  },
});

export default DownloadList;
