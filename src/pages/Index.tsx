
import React from "react";
import Layout from "@/components/Layout";
import Hero from "@/components/Hero";
import FileUpload from "@/components/FileUpload";
import Preview from "@/components/Preview";
import Features from "@/components/Features";
import Banks from "@/components/Banks";
import Footer from "@/components/Footer";
import PricingPlans from "@/components/PricingPlans";

const Index: React.FC = () => {
  return (
    <Layout>
      <Hero />
      <FileUpload />
      <Preview />
      <Features />
      <Banks />
      <PricingPlans onSelectPlan={() => {
        // For now we'll just handle this with a basic alert
        alert("This is a demo. In a real application, this would redirect to a checkout page.");
      }} />
      <Footer />
    </Layout>
  );
};

export default Index;
