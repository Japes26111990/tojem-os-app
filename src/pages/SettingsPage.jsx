import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import DepartmentsManager from '../components/features/settings/DepartmentsManager';
import ToolsManager from '../components/features/settings/ToolsManager';
import EmployeesManager from '../components/features/settings/EmployeesManager';
import ProductCatalogManager from '../components/features/settings/ProductCatalogManager';
import SuppliersManager from '../components/features/settings/SuppliersManager';
// Import the new unified manager
import InventoryManager from '../components/features/settings/InventoryManager';

const SettingsPage = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Settings & Data Management</h2>
        
        {/* We can re-organize the order here for a better flow */}
        <ProductCatalogManager />
        <SuppliersManager />
        <InventoryManager /> 
        <ToolsManager />
        <DepartmentsManager />
        <EmployeesManager />
      </div>
    </MainLayout>
  );
};

export default SettingsPage;