import axios from 'axios';
import ToastUtil from './ToastUtil';
import { useAuthStore } from '../global/useAuthStore';
import { isEmpty } from 'lodash';
import { useNavigation } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import { usePushy } from 'react-native-update';
import logUtil from './LogUtil';

axios.defaults.timeout = 30000; // 8 秒

// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: __DEV__ ? 'http://192.168.0.150:5000' : 'http://music.yangjian.tech',
  //timeout: 5000, // 设置超时时间
});

const initDeviceInfo = async () => {
  // 获取设备的型号
  const deviceModel = DeviceInfo.getModel();

  // 获取安卓版本号
  const systemVersion = DeviceInfo.getSystemVersion();
  // 取设备的品牌
  const brand = DeviceInfo.getBrand();
  apiClient.defaults.headers.common.deviceModel = deviceModel;
  apiClient.defaults.headers.common.systemVersion = systemVersion;
  apiClient.defaults.headers.common.brand = brand;
};

// 在应用启动时初始化全局拦截器
export const initializeAxios = (token: string) => {
  initDeviceInfo();
  apiClient.defaults.headers.common.token = token;

  // 请求拦截器（可选，动态设置 token）
  //   apiClient.interceptors.request.use(
  //     config => {
  //       const { user } = useUserStore.getState(); // 动态获取最新的 token
  //       if (user?.token) {
  //         config.headers.Authorization = `Bearer ${user.token}`;
  //       }
  //       return config;
  //     },
  //     error => {
  //       return Promise.reject(error);
  //     },
  //   );

  // 响应拦截器（可选，处理全局错误）
  apiClient.interceptors.response.use(
    response => response,
    error => {
      // 网络问题提前处理，不需要上传日志
      if (error.message === 'Network Error') {
        ToastUtil.showErrorToast('网络或服务器不给力~');
        return;
      }
      logUtil.error(
        `请求异常：${error.message} errName：${
          error?.name
        } errResponse.data:${JSON.stringify(error.response?.data)}`,
        'SYSTEM',
      );
      try {
        if (!isEmpty(error.response?.data)) {
          const message = error.response.data.message;
          if (Array.isArray(message)) {
            ToastUtil.showErrorToast(message.join('\n'));
          } else {
            ToastUtil.showErrorToast(message);
          }
          if (
            error.response.data.errCode === 'INVALID_TOKEN' ||
            error.response.data.errCode === 'MISS_TOKEN'
          ) {
            useAuthStore.getState().clearUser();
          }
        } else {
          ToastUtil.showErrorToast(`错误：${error.message}`);
        }
        return Promise.reject(error);
      } catch (err) {
        console.log('处理异常：' + err);
      }
    },
  );
};

export default apiClient;
