import React from 'react';
import ReactDOM from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './index.css';

import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom';

import { reduxStore } from './redux/store.js'
import { router } from './router';

import ThemeProvider from './context/ThemeProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={reduxStore}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
