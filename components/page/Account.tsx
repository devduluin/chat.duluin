'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Smartphone, ShieldCheck, Clock, Calendar, Lock, SmartphoneIcon, Activity, Package } from 'lucide-react';
import { format } from 'date-fns';
import AccountProps from '@/lib/account';

interface AccountState {
    data: AccountProps;
}

export function Account({ data }: AccountState) {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
        <p className="text-lg text-blue-600">@{data.username}</p>
      </div>

      {/* Main Account Card */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="pt-6 flex items-center text-xl font-semibold text-gray-800">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <span>Account Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-base font-medium">{data.email}</p>
                {data.email_verified_at && (
                  <Badge className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Smartphone className="w-4 h-4" />
                <span>Phone</span>
              </div>
              <p className="text-base font-medium mt-1">
                {data.phone || <span className="text-gray-400">Not provided</span>}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Status</span>
              </div>
              <Badge className={`mt-1 ${data.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {data.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Last Login</span>
              </div>
              <p className="text-base font-medium mt-1">
                {format(new Date(data.last_login), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Member Since</span>
              </div>
              <p className="text-base font-medium mt-1">
                {format(new Date(data.created_at), 'MMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Package className="w-4 h-4" />
                <span>Subscription</span>
              </div>
              <p className="text-base font-medium mt-1">
                {data.roles ? `Plan #${data.roles[0]?.name}` : 'No active subscription'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Security Card */}
        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="pt-6 flex items-center gap-3 text-xl font-semibold text-gray-800">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <span>Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ShieldCheck className="w-4 h-4" />
                <span>Two-Factor Authentication</span>
              </div>
              <Badge className="bg-gray-100 text-gray-700 mt-1">Not enabled</Badge>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <SmartphoneIcon className="w-4 h-4" />
                <span>Recent Devices</span>
              </div>
              <p className="text-base font-medium mt-1">
                {data.device_id || 'No device information available'}
              </p>
            </div>

            {/* <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
              View Security Settings
            </Button> */}
          </CardContent>
        </Card>

        {/* Activity Card */}
        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="pt-6 flex items-center gap-3 text-xl font-semibold text-gray-800">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
              <div>
                <p className="font-medium">Last login</p>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(data.last_login), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <div>
                <p className="font-medium">Email verified</p>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(data.email_verified_at), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            {/* <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 mt-4">
              View All Activity
            </Button> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}