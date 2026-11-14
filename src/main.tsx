import React from 'react';import {hydrateRoot} from 'react-dom/client';import App from './App';
import '../source-baseline/nepocore-library/app/globals.css';import '../source-baseline/nepocore-library/app/resource-studio.css';import '../source-baseline/nepocore-library/app/publishing.css';import '../source-baseline/nepocore-library/app/dialogs.css';import '../source-baseline/nepocore-library/app/features.css';import './staging.css';
hydrateRoot(document.getElementById('root')!,<App page={(window as any).__ATLAS_PAGE__}/>);
