import { useContext } from 'react';
import { ClimbDatabaseContext } from '../context/ClimbDatabaseContext';

export function useClimbDatabase() {
    return useContext(ClimbDatabaseContext);
}
