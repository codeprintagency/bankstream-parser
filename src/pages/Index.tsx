
import React from "react";
import Layout from "@/components/Layout";
import Hero from "@/components/Hero";
import FileUpload from "@/components/FileUpload";
import Preview from "@/components/Preview";
import Features from "@/components/Features";
import Banks from "@/components/Banks";
import Footer from "@/components/Footer";

const Index: React.FC = () => {
  return (
    <Layout>
      <Hero />
      <FileUpload />
      <Preview />
      <Features />
      <Banks />
      <Footer />
    </Layout>
  );
};

export default Index;
