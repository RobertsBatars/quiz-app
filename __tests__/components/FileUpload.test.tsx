import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '../../components/FileUpload';

describe('FileUpload Component', () => {
  const mockProjectId = 'test-project-123';

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders upload button', () => {
    render(<FileUpload projectId={mockProjectId} />);
    expect(screen.getByText(/upload files/i)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    render(<FileUpload projectId={mockProjectId} />);

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('textbox');

    Object.defineProperty(input, 'files', {
      value: [file]
    });

    fireEvent.change(input);

    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    render(<FileUpload projectId={mockProjectId} />);

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('textbox');

    Object.defineProperty(input, 'files', {
      value: [file]
    });

    fireEvent.change(input);
    fireEvent.click(screen.getByText(/upload files/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.any(Object));
    });
  });

  it('shows progress during upload', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100)));
    render(<FileUpload projectId={mockProjectId} />);

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('textbox');

    Object.defineProperty(input, 'files', {
      value: [file]
    });

    fireEvent.change(input);
    fireEvent.click(screen.getByText(/upload files/i));

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});