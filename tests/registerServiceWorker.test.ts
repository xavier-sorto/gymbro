import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker, UPDATE_READY_EVENT, type RegisterSw } from '../src/pwa/registerServiceWorker';

function capture() {
  let options: Parameters<RegisterSw>[0] = {};
  const register: RegisterSw = (given) => {
    options = given;
    return async () => {};
  };
  return { register, options: () => options };
}

describe('registerServiceWorker', () => {
  it('announces a waiting update', () => {
    const { register, options } = capture();
    const target = new EventTarget();
    const heard = vi.fn();
    target.addEventListener(UPDATE_READY_EVENT, heard);
    registerServiceWorker(register, target);
    options().onNeedRefresh?.();
    expect(heard).toHaveBeenCalledOnce();
  });

  it('logs a registration failure with an actionable message', () => {
    const { register, options } = capture();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerServiceWorker(register, new EventTarget());
    options().onRegisterError?.(new Error('denied'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('still works while online'), expect.any(Error));
    log.mockRestore();
  });
});
