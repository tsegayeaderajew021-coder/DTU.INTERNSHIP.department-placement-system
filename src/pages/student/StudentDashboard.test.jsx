import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StudentDashboard from './StudentDashboard';
import api from '../../services/api.js';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('StudentDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockNavigate.mockReset();

    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'Alice', role: 'student' }));
    api.get.mockResolvedValue({ data: [{ id: 1, name: 'Computer Science' }] });
  });

  it('shows the student overview and lets the student switch to profile editing', async () => {
    render(<StudentDashboard />);

    expect(await screen.findByText(/Academic GPA/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Stream/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /profile & verify/i }));

    expect(screen.getByText(/Academic Verification/i)).toBeInTheDocument();
  });

  it('shows only the requested Natural and Social streams in the student choice form', async () => {
    render(<StudentDashboard />);

    fireEvent.click(await screen.findByRole('button', { name: /submit preferences/i }));

    expect(screen.getAllByRole('option', { name: /Natural/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: /Social/i }).length).toBeGreaterThan(0);

    expect(screen.queryByRole('option', { name: /Engineering/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Business/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Health Sciences/i })).not.toBeInTheDocument();
  });

  it('does not crash when the student profile GPA is missing', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('departments_api.php')) {
        return Promise.resolve({ data: { departments: [] } });
      }
      if (url.includes('student_data_api.php')) {
        return Promise.resolve({ data: { success: true, student: undefined } });
      }
      if (url.includes('student_preferences.php')) {
        return Promise.resolve({ data: { success: true, choices: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<StudentDashboard />);

    expect(await screen.findByText(/Welcome, /i)).toBeInTheDocument();
    expect(screen.getByText(/Academic GPA/i)).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });
});
