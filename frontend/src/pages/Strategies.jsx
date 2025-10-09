import React from 'react';

const Strategies = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Trading Strategies</h1>
      <div className="bg-white p-8 rounded-lg shadow">
        <p className="text-gray-600">Strategies list will be implemented here</p>
      </div>
    </div>
  </div>
);

const StrategyDetail = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Strategy Detail</h1>
      <div className="bg-white p-8 rounded-lg shadow">
        <p className="text-gray-600">Strategy detail will be implemented here</p>
      </div>
    </div>
  </div>
);

const CreateStrategy = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Create Strategy</h1>
      <div className="bg-white p-8 rounded-lg shadow">
        <p className="text-gray-600">Strategy creation form will be implemented here</p>
      </div>
    </div>
  </div>
);

const Profile = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      <div className="bg-white p-8 rounded-lg shadow">
        <p className="text-gray-600">Profile page will be implemented here</p>
      </div>
    </div>
  </div>
);

const AdminPanel = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
      <div className="bg-white p-8 rounded-lg shadow">
        <p className="text-gray-600">Admin panel will be implemented here</p>
      </div>
    </div>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-gray-600">Page not found</p>
    </div>
  </div>
);

export default Strategies;
export { StrategyDetail, CreateStrategy, Profile, AdminPanel, NotFound };