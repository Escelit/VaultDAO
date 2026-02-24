"use client";

import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Wallet,
  Menu,
  X,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Activity as ActivityIcon,
  BarChart3,
  Files,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useWallet } from "../../hooks/useWallet";
import type { WalletAdapter } from "../../adapters";
import { WalletSwitcher } from "../WalletSwitcher";
import CopyButton from '../CopyButton';
import { LayoutErrorBoundary } from '../ErrorHandler';
import SkipLinks from '../SkipLinks';
import KeyboardShortcuts from '../KeyboardShortcuts';
import { useAccessibility } from '../../contexts/AccessibilityContext';

const DashboardLayout: React.FC = () => {
  const { isConnected, address, network, connect, disconnect, availableWallets, selectedWalletId, switchWallet } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { announceToScreenReader } = useAccessibility();

  const shortenAddress = (addr: string, chars = 4) => {
    return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Proposals', path: '/dashboard/proposals', icon: FileText },
    { label: 'Recurring Payments', path: '/dashboard/recurring-payments', icon: RefreshCw },
    { label: 'Activity', path: '/dashboard/activity', icon: ActivityIcon },
    { label: 'Templates', path: '/dashboard/templates', icon: Files },
    { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Error analytics', path: '/dashboard/errors', icon: AlertCircle },
    { label: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: 'g+o',
      description: 'Go to Overview',
      action: () => {
        navigate('/dashboard');
        announceToScreenReader('Navigated to Overview');
      },
      category: 'navigation' as const,
    },
    {
      key: 'g+p',
      description: 'Go to Proposals',
      action: () => {
        navigate('/dashboard/proposals');
        announceToScreenReader('Navigated to Proposals');
      },
      category: 'navigation' as const,
    },
    {
      key: 'g+a',
      description: 'Go to Activity',
      action: () => {
        navigate('/dashboard/activity');
        announceToScreenReader('Navigated to Activity');
      },
      category: 'navigation' as const,
    },
    {
      key: 'g+s',
      description: 'Go to Settings',
      action: () => {
        navigate('/dashboard/settings');
        announceToScreenReader('Navigated to Settings');
      },
      category: 'navigation' as const,
    },
    {
      key: 'w',
      description: 'Connect/Disconnect Wallet',
      action: () => {
        if (isConnected) {
          disconnect();
          announceToScreenReader('Wallet disconnected');
        } else {
          connect();
        }
      },
      category: 'actions' as const,
    },
  ];

  return (
    <>
      <SkipLinks />
      <div className="flex h-screen bg-gray-900 text-white font-sans">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside 
          id="navigation"
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-800/50 backdrop-blur-md border-r border-gray-700/50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
          aria-label="Main navigation"
        >
          <div className="p-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              VaultDAO
            </h1>
            <button 
              className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500" 
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <nav className="mt-6 px-4 space-y-2" aria-label="Dashboard navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${isActive ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`} 
                  onClick={() => setIsSidebarOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} className="mr-3" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="bg-gray-800/30 backdrop-blur-md border-b border-gray-700/50 h-20 flex items-center justify-between px-6 z-30">
            <button 
              className="md:hidden text-gray-400 hover:text-white p-2 hover:bg-gray-700/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500" 
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isSidebarOpen}
              aria-controls="navigation"
            >
              <Menu size={24} aria-hidden="true" />
            </button>
            <div className="flex-1 hidden md:block">
              <p className="text-gray-400 text-sm font-medium">Welcome back to VaultDAO</p>
            </div>
            <div id="wallet-controls" className="flex items-center space-x-4">
              {isConnected && address ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                    className="flex items-center space-x-3 bg-gray-800 border border-gray-700 hover:border-purple-500/50 px-3 py-2 md:px-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    aria-label={`Wallet menu for ${shortenAddress(address, 6)}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center font-bold text-xs" aria-hidden="true">
                      {address.slice(0, 2)}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs text-gray-400 leading-none mb-1">Stellar Account</p>
                      <p className="text-sm font-bold">{shortenAddress(address, 6)}</p>
                    </div>
                  </button>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} aria-hidden="true"></div>
                      <div 
                        className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl z-20 overflow-hidden"
                        role="menu"
                        aria-label="Wallet options"
                      >
                        <div className="p-4 border-b border-gray-700 flex flex-col items-center">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center font-bold text-lg mb-3 shadow-lg" aria-hidden="true">
                            {address.slice(0, 2)}
                          </div>
                          <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg w-full">
                            <p className="text-[10px] font-mono break-all text-center flex-1" aria-label={`Wallet address: ${address}`}>{address}</p>
                            <CopyButton text={address} iconSize={12} className="!bg-transparent !p-1" />
                          </div>
                        </div>
                        <div className="p-2">
                          {network !== "TESTNET" && (
                            <div className="m-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center text-yellow-500" role="alert">
                              <ShieldAlert size={14} className="mr-2" aria-hidden="true" />
                              <span className="text-[10px] font-bold">WRONG NETWORK</span>
                            </div>
                          )}
                          <button 
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" 
                            onClick={() => window.open(`https://stellar.expert/explorer/testnet/account/${address}`, "_blank")}
                            role="menuitem"
                          >
                            <ExternalLink size={16} className="mr-3" aria-hidden="true" /> View on Explorer
                          </button>
                          <button 
                            onClick={() => { disconnect(); setIsUserMenuOpen(false); }} 
                            className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            role="menuitem"
                          >
                            <LogOut size={16} className="mr-3" aria-hidden="true" /> Disconnect
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <WalletSwitcher
                    availableWallets={availableWallets}
                    selectedWalletId={selectedWalletId}
                    onSelect={(adapter: WalletAdapter) => switchWallet(adapter)}
                  />
                  <button
                    onClick={connect}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    aria-label="Connect wallet"
                  >
                    <Wallet size={18} className="mr-2" aria-hidden="true" /> Connect
                  </button>
                </div>
              )}
            </div>
          </header>
          <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-8" role="main">
            <LayoutErrorBoundary>
              <Outlet />
            </LayoutErrorBoundary>
          </main>
        </div>
      </div>
      <KeyboardShortcuts shortcuts={shortcuts} />
    </>
  );
};

export default DashboardLayout;