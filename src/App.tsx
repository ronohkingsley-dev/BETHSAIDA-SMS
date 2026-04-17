/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './lib/ThemeContext';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Learners from './pages/Learners';
import Academics from './pages/Academics';
import Finance from './pages/Finance';
import PromotionHub from './pages/PromotionHub';
import Settings from './pages/Settings';
import Teachers from './pages/Teachers';
import Boarders from './pages/Boarders';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'learners',
        element: <Learners />,
      },
      {
        path: 'academics',
        element: <Academics />,
      },
      {
        path: 'finance',
        element: <Finance />,
      },
      {
        path: 'promotion',
        element: <PromotionHub />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'teachers',
        element: <Teachers />,
      },
      {
        path: 'boarders',
        element: <Boarders />,
      },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

