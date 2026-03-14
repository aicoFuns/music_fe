import Toast from 'react-native-root-toast';
import { fontSizes } from '../Common.styles';
import { AppState } from 'react-native';

let toast: ReturnType<typeof Toast.show> | null = null;
const isAppInForeground = () => AppState.currentState === 'active';

const ToastUtil = {
  showDefaultToast: (title: string) => showToast(title, '#f2f2f2', '#000'),
  showToast: (
    title: string,
    duration?: number,
    position?: number,
  ) => showToast(title, '#f2f2f2', '#000', duration, position),
  hide: () => Toast.hide(toast),
  // 错误提示
  showErrorToast: (title: string) => showToast(title, '#f2f2f2', 'red'),
};

// 核心方法
const showToast = (
  title: string,
  backgroundColor: string,
  textColor: string,
  duration = Toast.durations.LONG,
  position = Toast.positions.TOP,
) => {
  // 如果不在前台，则忽略
  if (!isAppInForeground()) {
    console.log('当前App不在前台，忽略显示~');
    return;
  }
  console.log('当前App在前台，要进行消息展示~');
  if (toast) {
    Toast.hide(toast);
    toast = null;
  }

  toast = Toast.show(title, {
    duration,
    position,
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
    containerStyle: {
      backgroundColor,
      zIndex: 999,
      // padding: 16,
      // borderRadius: 8,
      maxHeight: 200, // 限制最大高度
      flexShrink: 1, // 允许内容收缩
      // paddingBottom: 10,
      marginTop: 80,
      // borderWidth: 1,
      // borderColor: '#007bff',
    },
    textStyle: {
      color: textColor,
      fontSize: fontSizes.small,
      textAlign: 'center',
      // paddingBottom: 10,
      // marginBottom: 10,
      lineHeight: 20,
    },
  });
};

export default ToastUtil;
