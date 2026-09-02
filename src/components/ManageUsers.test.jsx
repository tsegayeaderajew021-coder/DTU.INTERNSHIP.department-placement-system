import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageUsers from './ManageUsers';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

describe('ManageUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        users: [{ id: 1, username: 'alice', email: 'alice@example.com', role: 'student' }],
      },
    });
    api.put.mockResolvedValue({
      data: {
        success: true,
        user: { id: 1, username: 'alice2', email: 'alice2@example.com', role: 'admin' },
      },
    });
  });

  it('updates a user when save is clicked', async () => {
    render(<ManageUsers />);

    expect(await screen.findByText('alice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const roleSelect = screen.getByLabelText(/role/i);

    fireEvent.change(usernameInput, { target: { value: 'alice2' } });
    fireEvent.change(emailInput, { target: { value: 'alice2@example.com' } });
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(await screen.findByText('alice2')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
