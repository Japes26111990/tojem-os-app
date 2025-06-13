import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import DepartmentsManager from '../components/features/settings/DepartmentsManager';
import ToolsManager from '../components/features/settings/ToolsManager';
import EmployeesManager from '../components/features/settings/EmployeesManager';
import ProductCatalogManager from '../components/features/settings/ProductCatalogManager';
import SuppliersManager from '../components/features/settings/SuppliersManager';
import WorkshopSuppliesManager from '../components/features/settings/WorkshopSuppliesManager';
import ComponentsManager from '../components/features/settings/ComponentsManager';
import RawMaterialsManager from '../components/features/settings/RawMaterialsManager';

// We'll define our settings tabs here
const settingTabs = [
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'catalog', label: 'Product Catalog' },
  { id: 'components', label: 'Components' },
  { id: 'rawMaterials', label: 'Raw Materials' },
  { id: 'workshopSupplies', label: 'Workshop Supplies' },
  { id: 'tools', label: 'Tools' },
  { id: 'departments', label: 'Departments' },
  { id: 'employees', label: 'Employees' },
];

const SettingsPage = () => {
  // State to keep track of the currently active tab
  const [activeTab, setActiveTab] = useState('suppliers');

  // A small component for the tab buttons
  const TabButton = ({ id, label }) => {
    const isActive = activeTab === id;
    const activeClass = "bg-blue-600 text-white";
    const inactiveClass = "bg-gray-700 hover:bg-gray-600 text-gray-300";
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? activeClass : inactiveClass}`}
      >
        {label}
      </button>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Settings & Data Management</h2>

        {/* This is our new sub-navigation bar */}
        <div className="flex flex-wrap gap-2">
          {settingTabs.map(tab => (
            <TabButton key={tab.id} id={tab.id} label={tab.label} />
          ))}
        </div>

        {/* This section will now only render the active component */}
        <div className="mt-6">
          {activeTab === 'suppliers' && <SuppliersManager />}
          {activeTab === 'catalog' && <ProductCatalogManager />}
          {activeTab === 'components' && <ComponentsManager />}
          {activeTab === 'rawMaterials' && <RawMaterialsManager />}
          {activeTab === 'workshopSupplies' && <WorkshopSuppliesManager />}
          {activeTab === 'tools' && <ToolsManager />}
          {activeTab === 'departments' && <DepartmentsManager />}
          {activeTab === 'employees' && <EmployeesManager />}
        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;