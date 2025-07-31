// src/pages/SettingsPage.jsx

import React, { useState, useMemo, useEffect } from 'react';
import InventoryManager from '../components/features/settings/InventoryManager';
import DepartmentsManager from '../components/features/settings/DepartmentsManager';
import ToolsManager from '../components/features/settings/ToolsManager';
import EmployeesManager from '../components/features/settings/EmployeesManager';
import ToolAccessoriesManager from '../components/features/settings/ToolAccessoriesManager';
import OverheadsManager from '../components/features/settings/OverheadsManager';
import SkillsManager from '../components/features/settings/SkillsManager';
import UserManagementPage from './UserManagementPage';
import CampaignManager from '../components/features/settings/CampaignManager';
import FinancialSettings from '../components/features/settings/FinancialSettings';
import TrainingManager from '../components/features/settings/TrainingManager';
import ReworkReasonsManager from '../components/features/settings/ReworkReasonsManager';
import RoleManager from '../components/features/settings/RoleManager';
import RoutineTasksManager from '../components/features/settings/RoutineTasksManager';
import LearningPathManager from '../components/features/settings/LearningPathManager';
import KaizenManager from '../components/features/settings/KaizenManager';

// Import all consolidated managers from the single updated file
import { 
    ProductCategoryManager, 
    MakeManager, 
    ModelManager, 
    UnitManager 
} from '../components/features/settings/ProductCategoryManager';

import { getProductCategories, getMakes, getModels, getUnits } from '../api/firestore';

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
  const [activeTab, setActiveTab] = useState('inventory');
  
  const [catalogData, setCatalogData] = useState({
    categories: [],
    makes: [],
    models: [],
    units: []
  });

  const fetchCatalogData = async () => {
    const [cats, mks, mdls, uts] = await Promise.all([
        getProductCategories(),
        getMakes(),
        getModels(),
        getUnits()
    ]);
    setCatalogData({ categories: cats, makes: mks, models: mdls, units: uts });
  };

  useEffect(() => {
    if (activeTab === 'catalog_data') {
        fetchCatalogData();
    }
  }, [activeTab]);


  const tabs = useMemo(() => ({
    inventory: {
      label: 'Inventory & Products',
      components: [<InventoryManager key="inventory" />]
    },
    catalog_data: {
        label: 'Catalog Data',
        components: [
            <ProductCategoryManager key="prod-cats" items={catalogData.categories} onDataChange={fetchCatalogData} />,
            <MakeManager key="makes" items={catalogData.makes} categories={catalogData.categories} onDataChange={fetchCatalogData} />,
            <ModelManager key="models" items={catalogData.models} makes={catalogData.makes} onDataChange={fetchCatalogData} />,
            <UnitManager key="units" items={catalogData.units} onDataChange={fetchCatalogData} />,
        ]
    },
    assets: {
      label: 'Tools & Assets',
      components: [<ToolsManager key="tools" />, <ToolAccessoriesManager key="tool-accessories" />]
    },
    company: {
       label: 'Company & Staff',
      components: [
          <DepartmentsManager key="departments" />,
          <EmployeesManager key="employees" />,
          <SkillsManager key="skills" />,
          <ReworkReasonsManager key="rework-reasons" />,
          <RoutineTasksManager key="routine-tasks" />
      ]
    },
    training: {
        label: 'Training',
        components: [<LearningPathManager key="learning-paths" />, <TrainingManager key="training" />]
    },
    kaizen: {
        label: 'Kaizen (Improvement)',
        components: [<KaizenManager key="kaizen" />]
    },
    financials: {
      label: 'Financials',
      components: [<OverheadsManager key="overheads" />, <FinancialSettings key="financial-settings" />]
    },
    marketing: {
      label: 'Marketing',
      components: [<CampaignManager key="campaigns" />]
    },
    users: {
       label: 'User Logins',
      components: [<UserManagementPage key="user-management" />]
    },
    roles: {
        label: 'Roles & Permissions',
        components: [<RoleManager key="role-manager" />]
    }
  }), [catalogData]); // Re-render tabs when catalog data changes

  return (
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

      <div className="space-y-8">
        {tabs[activeTab].components}
      </div>
    </div>
  );
};

export default SettingsPage;