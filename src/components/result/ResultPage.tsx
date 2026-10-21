import React from 'react';
import { usePortal } from '../../store/portalStore';
import { ResultClassSelectorPage } from './ResultClassSelectorPage';
import { ClassResultTabulationPage } from './ClassResultTabulationPage';
import { StudentMarksheetView } from './StudentMarksheetView';
import { ResultSettingsPage } from './ResultSettingsPage';

export const ResultPage: React.FC = () => {
  const { currentRoute } = usePortal();

  // 1. Settings view: /result/settings
  if (currentRoute.isSettings) {
    return <ResultSettingsPage />;
  }

  // 2. Single Student Marksheet view: /result/:classId/student/:studentId
  if (currentRoute.classId && currentRoute.studentId) {
    return (
      <StudentMarksheetView
        classId={currentRoute.classId}
        studentId={currentRoute.studentId}
      />
    );
  }

  // 3. Class Tabulation & Merit List view: /result/:classId
  if (currentRoute.classId) {
    return <ClassResultTabulationPage classId={currentRoute.classId} />;
  }

  // 4. Default: All Classes Result Overview: /result
  return <ResultClassSelectorPage />;
};
