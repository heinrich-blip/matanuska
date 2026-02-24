import Layout from "@/components/Layout";
import InspectorManagement from "@/components/admin/InspectorManagement";

const InspectorProfiles = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Inspector Profiles</h1>
          <p className="text-muted-foreground">
            Manage inspector accounts and permissions
          </p>
        </div>
        <InspectorManagement />
      </div>
    </Layout>
  );
};

export default InspectorProfiles;