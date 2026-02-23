// src/pages/DriverManagement.tsx
'use client';

import DriverBehaviorGrid from "@/components/driver/DriverBehaviorGrid";
import DriverManagementSection from "@/components/driver/DriverManagementSection";
import DriverRecruitmentSection from "@/components/driver/DriverRecruitmentSection";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Car, FileText, TrendingUp, UserPlus, Users } from "lucide-react";

export default function DriverManagement() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-600" />
              Driver Management
            </h1>
            <p className="text-muted-foreground">
              Monitor performance, behavior, and corrective actions in real-time
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        <Tabs defaultValue="registry" className="space-y-6">
          <TabsList className="flex overflow-x-auto w-full lg:grid lg:grid-cols-5">
            <TabsTrigger value="registry" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Driver Registry
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              HR Recruitment
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Behavior Events
            </TabsTrigger>
            <TabsTrigger value="car" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              CAR Reports
            </TabsTrigger>
          </TabsList>

          {/* Driver Registry */}
          <TabsContent value="registry">
            <DriverManagementSection />
          </TabsContent>

          {/* HR Driver Recruitment */}
          <TabsContent value="recruitment">
            <Card>
              <CardHeader>
                <CardTitle>HR Driver Recruitment</CardTitle>
                <CardDescription>
                  Manage potential driver candidates through a structured three-step evaluation process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DriverRecruitmentSection />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Driver Performance Dashboard</CardTitle>
                <CardDescription>
                  Key metrics: safety score, fuel efficiency, on-time rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <p className="text-sm font-medium text-blue-700">Average Safety Score</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">94.2</p>
                    <p className="text-xs text-blue-600 mt-2">+2.1 from last month</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <p className="text-sm font-medium text-green-700">Fuel Efficiency</p>
                    <p className="text-3xl font-bold text-green-900 mt-1">8.7 L/100km</p>
                    <p className="text-xs text-green-600 mt-2">-0.3 L vs target</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                    <p className="text-sm font-medium text-purple-700">On-Time Rate</p>
                    <p className="text-3xl font-bold text-purple-900 mt-1">98.5%</p>
                    <p className="text-xs text-purple-600 mt-2">Top 5% in fleet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Behavior Events */}
          <TabsContent value="behavior">
            <Card>
              <CardHeader>
                <CardTitle>Behavior Events</CardTitle>
                <CardDescription>
                  Real-time monitoring with search, sort, and coaching
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DriverBehaviorGrid />
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAR Reports */}
          <TabsContent value="car">
            <Card>
              <CardHeader>
                <CardTitle>Corrective Action Request (CAR) Reports</CardTitle>
                <CardDescription>
                  Track coaching outcomes and driver improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="font-medium text-amber-900">CAR-2025-001</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Hard braking incident → Coaching completed on Oct 28
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-900">CAR-2025-002</p>
                    <p className="text-sm text-green-700 mt-1">
                      Speeding → Action plan in progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}