import React from 'react';import {hydrateRoot} from 'react-dom/client';import App from './App';
import RecoveryBoundary from './RecoveryBoundary';
import '../source-baseline/nepocore-library/app/globals.css';import '../source-baseline/nepocore-library/app/resource-studio.css';import '../source-baseline/nepocore-library/app/publishing.css';import '../source-baseline/nepocore-library/app/dialogs.css';import '../source-baseline/nepocore-library/app/features.css';import './staging.css';
import './smooth.css';
import './search.css';
import './media.css';
import './downloads.css';
hydrateRoot(document.getElementById('root')!,<RecoveryBoundary><App page={(window as any).__ATLAS_PAGE__}/></RecoveryBoundary>);
