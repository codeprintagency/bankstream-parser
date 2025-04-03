
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { UserUpload } from "@/components/dashboard/UserUpload";
import { LoadingSpinner } from "@/components/admin/LoadingSpinner";

const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuth();

  // If still loading auth state, show loading spinner
  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  // If not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" />;
  }

  return (
    <Layout>
      <div className="bg-gradient-to-b from-purple-50 to-indigo-50 min-h-[calc(100vh-5rem)]">
        <div className="container mx-auto px-4 md:px-8 py-16 md:py-20">
          <h1 className="text-3xl font-bold mb-2 text-center text-gray-800">
            Welcome to Your Dashboard
          </h1>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Easily convert your bank statements to Excel with our powerful AI. Your data is processed securely and never stored.
          </p>
          
          <UserUpload />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
