import React, { useState, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import DepartmentsManager from '../components/features/settings/DepartmentsManager';
import ToolsManager from '../components/features/settings/ToolsManager';
import EmployeesManager from '../components/features/settings/EmployeesManager';
import SuppliersManager from '../components/features/settings/SuppliersManager';
import InventoryManager from '../components/features/settings/InventoryManager';
import ToolAccessoriesManager from '../components/features/settings/ToolAccessoriesManager';
import ProductRecipeManager from '../components/features/settings/ProductRecipeManager'; // <-- IMPORT NEW

const TabButton = ({ label, isActive, onClick }) => {
  const baseClasses = "px-4 py-2 text-sm font-medium rounded-md focus:outline-none transition-colors";
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "bg-gray-800 text-gray-300 hover:bg-gray-700";

  return (
    <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
    </button>
  );
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('products');

  const tabs = useMemo(() => ({
    products: {
      label: 'Products & Recipes',
      // USE THE NEW UNIFIED COMPONENT HERE
      components: [<ProductRecipeManager key="product-recipe" />]
    },
    inventory: {
      label: 'Inventory & Suppliers',
      components: [<InventoryManager key="inventory" />, <SuppliersManager key="suppliers" />]
    },
    assets: {
      label: 'Tools & Assets',
      components: [<ToolsManager key="tools" />, <ToolAccessoriesManager key="tool-accessories" />]
    },
    company: {
      label: 'Company & Staff',
      components: [<DepartmentsManager key="departments" />, <EmployeesManager key="employees" />]
    }
  }), []);

  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Settings & Data Management</h2>

        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900/50 rounded-lg">
          {Object.entries(tabs).map(([tabKey, tabData]) => (
            <TabButton
              key={tabKey}
              label={tabData.label}
              isActive={activeTab === tabKey}
              onClick={() => setActiveTab(tabKey)}
            />
          ))}
        </div>

        {/* This content area is now much cleaner */}
        <div className="space-y-8">
          {tabs[activeTab].components}
        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;