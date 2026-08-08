import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  realGrmf: number;
  taskProgress: Record<string, any>;
  addGrmf: (amount: number) => void;
  updateTask: (taskId: string, updates: Record<string, any>) => void;
  syncFromServer: (data: any) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      realGrmf: 0,
      taskProgress: {},
      addGrmf: (amount) => set((state) => ({ realGrmf: state.realGrmf + amount })),
      updateTask: (taskId, updates) => set((state) => ({
        taskProgress: {
          ...state.taskProgress,
          [taskId]: {
            ...(state.taskProgress[taskId] || {}),
            ...updates
          }
        }
      })),
      syncFromServer: (data) => set((state) => {
        // Only sync if server has more data or to resolve conflicts, 
        // for simplicity, we just sync balance and taskProgress
        return {
          realGrmf: Math.max(state.realGrmf, data.realBalances?.GRMF || 0),
          taskProgress: { ...state.taskProgress, ...data.taskProgress }
        };
      })
    }),
    {
      name: 'user-storage',
    }
  )
);
