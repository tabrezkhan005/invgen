'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, TrendingUp, Users, Download, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import AppLayout from '../components/AppLayout';
import { formatCurrency } from '@/lib/utils';
import type { AppSettings, RevenueData, CustomerAnalytics } from '@/types/electron';

// Type definitions
interface TopCustomerDisplay {
  name: string;
  value: number;
  invoices: number;
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomerDisplay[]>([]);
  const [stats, setStats] = useState({
    activeCustomers: 0
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [revData, customersData, statsData, settingsData] = await Promise.all([
        window.electronAPI.getRevenueByDate(dateRange),
        window.electronAPI.getTopCustomers(dateRange),
        window.electronAPI.getDashboardStats(),
        window.electronAPI.getAllSettings()
      ]);

      setRevenueData(revData || []);
      setTopCustomers((customersData || []).map((c: CustomerAnalytics) => ({
        name: c.name,
        value: c.total_spent || 0,
        invoices: c.invoice_count || 0
      })));
      setStats(statsData);
      setSettings(settingsData);

    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const chartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(var(--primary))',
    },
    invoices: {
      label: 'Invoices',
      color: 'hsl(var(--secondary))',
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalInvoices = revenueData.reduce((sum, item) => sum + (item.invoices || 0), 0);
  const avgOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  if (error) {
    return (
      <AppLayout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Analytics</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={loadAnalyticsData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Analytics"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Analytics" }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your business performance and customer insights
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Date Range</CardTitle>
            <CardDescription>
              Select the period for your analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-fit px-3 py-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-fit px-3 py-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(totalRevenue, settings?.currency_symbol || '₹')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">For selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : totalInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">Generated invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(avgOrderValue, settings?.currency_symbol || '₹')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per invoice</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.activeCustomers}</div>
              <p className="text-xs text-muted-foreground mt-1">In last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Daily revenue performance
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              {revenueData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>
                Highest spenders in this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCustomers.length > 0 ? (
                  topCustomers.slice(0, 6).map((customer, index) => (
                    <div key={customer.name} className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div className="ml-4 flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.invoices} invoices
                        </p>
                      </div>
                      <div className="font-semibold text-sm">
                        {formatCurrency(customer.value, settings?.currency_symbol || '₹')}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No customer data found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
            <CardDescription>
              Download your analytics data for offline use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => window.electronAPI.exportInvoicesToPDF(dateRange)}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.electronAPI.exportReportsToExcel(dateRange)}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.electronAPI.exportCustomerLedgerToCSV()}>
                <Download className="h-4 w-4 mr-2" />
                Export Customer Ledger
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
