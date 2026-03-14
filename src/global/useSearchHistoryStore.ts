import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { produce } from 'immer';

// 定义接口和状态类型
interface useSearchListStore {
  history: Array<String>;
  isHydrated: boolean; // 标记持久化状态是否已恢复
  setIsHydrated: () => void;
  addKeyword: (keyWord: string) => void;
  deleteKeyword: (keyword: string) => void;
}

const useSearchHistoryStore = create<useSearchListStore>()(
  persist(
    (set, get) => ({
      history: [], // 搜索历史列表
      isHydrated: false, // 初始值为 false
      setIsHydrated: () => set({ isHydrated: true }),
      // 使用 immer 优化的添加关键字方法
      addKeyword: (keyword: string) =>
        set(
          produce(state => {
            // 移除旧关键字并添加到最前面
            state.history = [
              keyword,
              ...state.history.filter((item: string) => item !== keyword),
            ];
            // 限制最多保留 10 条记录
            state.history = state.history.slice(0, 10);
          }),
        ),

      // 使用 immer 优化的删除关键字方法
      deleteKeyword: (keyword: string) =>
        set(
          produce(state => {
            // 过滤掉目标关键字
            state.history = state.history.filter((item: string) => item !== keyword);
          }),
        ),

      // 清空所有记录
      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: 'search-key-word', // AsyncStorage 中的 key
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
        state?.setIsHydrated();
      },
    },
  ),
);

export default useSearchHistoryStore;
