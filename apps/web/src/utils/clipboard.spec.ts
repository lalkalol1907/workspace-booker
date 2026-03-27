import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyTextToClipboard } from './clipboard';

describe('copyTextToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    await copyTextToClipboard('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when Clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    document.execCommand = vi.fn().mockReturnValue(true);

    await copyTextToClipboard('fallback text');

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(removeChild).toHaveBeenCalled();
  });

  it('throws when execCommand returns false', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    document.execCommand = vi.fn().mockReturnValue(false);

    await expect(copyTextToClipboard('fail')).rejects.toThrow(
      'execCommand copy returned false',
    );
  });
});
