import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from '../../components/FileUpload';

describe('FileUpload Component', () => {
  it('renders upload button', () => {
    render(<FileUpload onUpload={() => {}} />);
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    const mockOnUpload = jest.fn();
    render(<FileUpload onUpload={mockOnUpload} />);

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/upload file/i);

    Object.defineProperty(input, 'files', {
      value: [file]
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(expect.any(File));
    });
  });

  it('shows error for invalid file type', async () => {
    render(<FileUpload onUpload={() => {}} />);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/upload file/i);

    Object.defineProperty(input, 'files', {
      value: [file]
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during upload', async () => {
    const mockOnUpload = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<FileUpload onUpload={mockOnUpload} />);

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/upload file/i);

    Object.defineProperty(input, 'files', {
      value: [file]
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });
});