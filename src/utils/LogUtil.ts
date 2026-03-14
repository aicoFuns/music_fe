import { isEmpty } from 'lodash';
import { useAuthStore } from '../global/useAuthStore';
import apiClient from './ApiClient';

// LogManager.ts
interface Log {
  message: string;
  level: LogLevel;
  action: LogAction;
  version: string;
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR';
type LogAction =
  | 'DEFAULT'
  | 'SYSTEM'
  | 'ACCOUNT'
  | 'SEARCH'
  | 'UPDATE'
  | 'PLAYLIST'
  | 'DOWNLOAD'
  | 'PLAY'
  | 'SOUNDALBUM';

class LogUtil {
  private logs: Log[] = []; // 本地缓存日志
  private lastUploadTime: number = Date.now();
  private uploading: boolean = false; // 避免重复上传
  private uploadTimer: NodeJS.Timeout | null = null;
  private currentVersion: string = '';

  private readonly MAX_LOG_COUNT: number = 10; // 达到10条日志就上传
  private readonly UPLOAD_INTERVAL: number = 10000; // 超过10秒触发上传
  private readonly MAX_MESSAGE_LENGTH = 2000;

  constructor() {
    this.checkUploadInterval();
  }

  public initLogUtil(currentVersion: string) {
    this.currentVersion = currentVersion;
  }

  public info(message: string, action: LogAction = 'DEFAULT') {
    this.addLog('INFO', action, message);
  }

  public warn(message: string, action: LogAction = 'DEFAULT') {
    this.addLog('WARN', action, message);
  }

  public error(message: string, action: LogAction = 'SYSTEM') {
    this.addLog('ERROR', action, message);
  }

  // 添加日志
  private addLog(
    level: LogLevel = 'INFO',
    action: LogAction = 'DEFAULT',
    message: string,
  ): void {
    console.log(`记录云端日志：${JSON.stringify(message)}`);
    //未登录用户忽略日志
    if (isEmpty(useAuthStore.getState().loginedUser)) {
      console.log(`注意：用户未登录，此日志不上传云端，内容：${message}`);
      return;
    }
    if (message.length > this.MAX_MESSAGE_LENGTH) {
      message = message.slice(0, this.MAX_MESSAGE_LENGTH) + '...';
    }
    const log: Log = { message, level, action, version: this.currentVersion };
    this.logs.push(log);
    if (
      this.logs.length >= this.MAX_LOG_COUNT ||
      Date.now() - this.lastUploadTime >= this.UPLOAD_INTERVAL
    ) {
      this.uploadLogs();
    }
  }

  // 检查日志上传条件
  private checkUploadInterval(): void {
    this.uploadTimer = setInterval(() => {
      if (
        this.logs.length >= this.MAX_LOG_COUNT ||
        Date.now() - this.lastUploadTime >= this.UPLOAD_INTERVAL
      ) {
        this.uploadLogs();
      }
    }, 1000);
  }

  // 上传日志
  private async uploadLogs(): Promise<void> {
    if (this.uploading || this.logs.length === 0) {
      this.lastUploadTime = Date.now(); // 更新最后上传时间

      return;
    }
    this.uploading = true;

    try {
      const logsToUpload: Log[] = [...this.logs]; // 拷贝一份日志
      this.logs = []; // 上传后清空日志缓存

      // 异步上传日志
      await this.sendLogsToServer(logsToUpload);
      this.lastUploadTime = Date.now(); // 更新最后上传时间
    } catch (error) {
      console.error('Error uploading logs:', error);
    } finally {
      this.uploading = false;
    }
  }

  // 模拟上传日志到服务器
  private async sendLogsToServer(logs: Log[]): Promise<void> {
    try {
      await apiClient.post('/user/add-logs', {
        logs: logs,
      });
    } catch (error) {
      console.error('Failed to send logs:', error);
    }
  }

  // 停止定时器
  public stop(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
    }
  }
}

const logUtil = new LogUtil();
export default logUtil;
