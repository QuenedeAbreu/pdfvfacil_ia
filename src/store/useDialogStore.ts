import { create } from 'zustand'

type DialogState = {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  message: string;
  resolvePromise: ((value: boolean | PromiseLike<boolean>) => void) | null;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  closeDialog: (result: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isOpen: false,
  type: 'alert',
  message: '',
  resolvePromise: null,

  showAlert: (message: string) => {
    return new Promise<void>((resolve) => {
      set({
        isOpen: true,
        type: 'alert',
        message,
        resolvePromise: (val: boolean | PromiseLike<boolean>) => resolve(),
      })
    })
  },

  showConfirm: (message: string) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        type: 'confirm',
        message,
        resolvePromise: resolve,
      })
    })
  },

  closeDialog: (result: boolean) => {
    const { resolvePromise } = get()
    if (resolvePromise) {
      resolvePromise(result)
    }
    set({ isOpen: false, resolvePromise: null })
  }
}))
