import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PersonLedger from './pages/PersonLedger';
import MessageCustomization from './pages/MessageCustomization';
import ChangeGmailId from './pages/ChangeGmailId';
import BankHolidays from './pages/BankHolidays';
import Letterhead from './pages/Letterhead';
import ItemManager from './pages/ItemManager';
import HelpSupport from './pages/HelpSupport';
import RecycleBin from './pages/RecycleBin';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/person/:personName/:personCategory" element={<PersonLedger />} />
          <Route path="/person/:personName" element={<PersonLedger />} />
          <Route path="/message-customization" element={<MessageCustomization />} />
          <Route path="/change-gmail" element={<ChangeGmailId />} />
          <Route path="/bank-holidays" element={<BankHolidays />} />
          <Route path="/letterhead" element={<Letterhead />} />
          <Route path="/item-manager" element={<ItemManager />} />
          <Route path="/help-support" element={<HelpSupport />} />
          <Route path="/recycle-bin" element={<RecycleBin />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default App;
