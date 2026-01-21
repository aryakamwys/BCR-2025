import React, { useState, useEffect } from 'react';
import { Layout, Button, Dropdown, Avatar, Input } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar, { defaultMenuItems } from './AppSidebar';

const { Header, Content } = Layout;

const LS_AUTH = "imr_admin_authed";
const ADMIN_USER = "izbat@izbat.org";
const ADMIN_PASS = "12345678";

function loadAuth() {
  return localStorage.getItem(LS_AUTH) === "true";
}

function saveAuth(v: boolean) {
  localStorage.setItem(LS_AUTH, v ? "true" : "false");
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [authed, setAuthed] = useState(loadAuth());
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authed) {
      // Stay on login screen
    }
  }, [authed]);

  // Responsive behavior - collapse on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    // Listen for resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      saveAuth(true);
      setAuthed(true);
      setError("");
    } else {
      setError("Username atau password salah!");
    }
  };

  const handleLogout = () => {
    saveAuth(false);
    setAuthed(false);
    setUser("");
    setPass("");
    navigate('/leaderboard');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  // Show login form if not authenticated
  if (!authed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img src="/Assets/logo.png" alt="Logo" className="h-20 w-auto object-contain" />
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Admin Login</h2>
            <p className="text-center text-gray-600 mb-8">Silakan login untuk akses admin panel</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  id="admin-email"
                  type="email"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="admin@example.com"
                  size="large"
                  required
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <Input.Password
                  id="admin-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  size="large"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Login
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/leaderboard')}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                ← Kembali ke Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <AppSidebar collapsed={collapsed} menuItems={defaultMenuItems} />

      {/* Main Content */}
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 256,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Collapse Button */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 48,
              height: 48,
            }}
          />

          {/* User Menu */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-3 cursor-pointer">
              <Avatar size="default" icon={<UserOutlined />} className="bg-red-500" />
              <span className="text-gray-700 font-medium hidden sm:block">Admin</span>
            </div>
          </Dropdown>
        </Header>

        {/* Page Content */}
        <Content
          style={{
            margin: '24px 24px 0',
            padding: 24,
            minHeight: 280,
            background: '#f0f2f5',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
