import React from 'react';
import DataHubShell from './data-hub/DataHubShell';
import { useDataHubController } from '../hooks/useDataHubController';

/**
 * DataHub entry — orchestration lives in useDataHubController (Bolt 3.7).
 */
const DataHub = (props) => {
    const controller = useDataHubController(props);
    return <DataHubShell {...controller} />;
};

export default DataHub;
