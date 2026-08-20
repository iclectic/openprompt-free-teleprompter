import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecordMode from './RecordMode';
import { clearLocalData, saveScript } from '@/lib/storage';

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['video'], { type: 'video/webm' }) } as BlobEvent);
    this.onstop?.();
  }
}

const renderRecordMode = (id: string) => render(
  <MemoryRouter initialEntries={[`/record/${id}`]}>
    <Routes>
      <Route path="/record/:id" element={<RecordMode />} />
    </Routes>
  </MemoryRouter>,
);

describe('RecordMode', () => {
  beforeEach(() => {
    clearLocalData();
    vi.restoreAllMocks();
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ readyState: 'live', stop: vi.fn() }],
        }),
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  });

  it('starts camera, recording and teleprompter from the primary recording button', async () => {
    const script = saveScript({ title: 'Launch', content: 'Line one\nLine two' });

    renderRecordMode(script.id);

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({
      audio: true,
      video: expect.objectContaining({ facingMode: 'user' }),
    }));
    expect(await screen.findByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    expect(screen.getByText(/Recording\.\.\./i)).toBeInTheDocument();
  });
});
