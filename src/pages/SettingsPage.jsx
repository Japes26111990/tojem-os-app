import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import DepartmentsManager from '../components/features/settings/DepartmentsManager';
import ToolsManager from '../components/features/settings/ToolsManager';
import EmployeesManager from '../components/features/settings/EmployeesManager';
import ProductCatalogManager from '../components/features/settings/ProductCatalogManager'; // <-- 1. Import

const SettingsPage = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Settings & Data Management</h2>
        <ProductCatalogManager /> {/* <-- 2. Add it here */}
        <EmployeesManager />
        <DepartmentsManager />
        <ToolsManager />
      </div>
    </MainLayout>
  );
};

export default SettingsPage;