import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserType = 'Free' | 'Vip';

// 定义接口和状态类型
interface useAuthStateStore {
  loginedUser: {
    userName: string | null;
    createTime: string | null;
    expiredTime: string | null;
    token: string | null;
    weiXin: string | null;
    userType: UserType | null;
  } | null;
  loading: boolean;
  readUserMsgIds: number[];
  isHydrated: boolean; // 标记持久化状态是否已恢复
  register: (
    username: string,
    password: string,
    confirmPassword: string,
  ) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  setIsHydrated: () => void;
  setUser: (loginedUser: {
    userName: string | null;
    createTime: string | null;
    expiredTime: string | null;
    token: string | null;
    weiXin: string | null;
    userType: UserType | null;
  }) => void;
  clearUser: () => void;
  updateReadUserMsgIds: (msgId: number) => void;
}

// 创建 Zustand Store
export const useAuthStore = create<useAuthStateStore>()(
  persist(
    (set, get) => ({
      loginedUser: null,
      loading: false,
      isHydrated: false, // 初始值为 false
      readUserMsgIds: [],
      setIsHydrated: () => set({ isHydrated: true }),
      setUser: loginedUser => set({ loginedUser }),
      clearUser: () => {
        set({ loginedUser: null });
      },
      updateReadUserMsgIds: msgId => {
        const currentReadMsgIds = get().readUserMsgIds;
        currentReadMsgIds.push(msgId);
        set({ readUserMsgIds: currentReadMsgIds });
      },
      // 注册方法
      register: async (
        userName,
        password,
        confirmPassword,
      ): Promise<boolean> => {
        return false;
      },

      // 登录方法
      login: async (userName, password): Promise<boolean> => {
        return false;
      },
      // 登出方法
      logout: async (): Promise<boolean> => {
        return false;
      },
    }),
    {
      name: 'user-auth-state', // AsyncStorage 中的 key
      storage: {
        getItem: async key => {
          const value = await AsyncStorage.getItem(key);
          return value ? JSON.parse(value) : null; // 反序列化读取的值
        },
        setItem: async (key, value) => {
          await AsyncStorage.setItem(key, JSON.stringify(value)); // 序列化存储的值
        },
        removeItem: async key => {
          await AsyncStorage.removeItem(key); // 删除存储的值
        },
      },
      onRehydrateStorage: () => state => {
        // 使用 useAuthStore.setState 来显式设置 isHydrated
        // console.log(`读取完成${JSON.stringify(state)}`);
        state?.setIsHydrated();
      },
    },
  ),
);
