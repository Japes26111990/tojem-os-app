import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import JobCardCreator from '../components/features/job_cards/JobCardCreator';

const JobCreatorPage = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Job Card Creator</h2>
        <JobCardCreator />
      </div>
    </MainLayout>
  );
};

export default JobCreatorPage;