'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, ShieldAlert, RotateCcw, Lock } from 'lucide-react';

interface PinManagementProps {
  pinSet: boolean;
  onSetPin: (currentPin: string, newPin: string, confirmPin: string) => void;
  onResetSettings: () => void;
  loading: boolean;
  message: string;
}

export default function PinManagement({
  pinSet,
  onSetPin,
  onResetSettings,
  loading,
  message
}: PinManagementProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSetPin(currentPin, newPin, confirmPin);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${pinSet ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {pinSet ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold">Admin PIN Status</p>
            <p className="text-xs text-muted-foreground">
              {pinSet ? 'Protected mode is active' : 'No security PIN configured'}
            </p>
          </div>
        </div>
        <Badge variant={pinSet ? "default" : "outline"} className={pinSet ? "bg-green-600 hover:bg-green-600" : "text-amber-600 border-amber-200"}>
          {pinSet ? 'SECURED' : 'UNSECURED'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {pinSet ? 'Update Security PIN' : 'Initialize Security PIN'}
        </h3>

        <div className="grid gap-4">
          {pinSet && (
            <div className="grid gap-2">
              <Label htmlFor="currentPin">Current PIN</Label>
              <Input
                id="currentPin"
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                className="font-mono tracking-widest"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newPin">New PIN (4-6 digits)</Label>
              <Input
                id="newPin"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                className="font-mono tracking-widest"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPin">Confirm New PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                className="font-mono tracking-widest"
              />
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.toLowerCase().includes('success') ? 'default' : 'destructive'} className={message.toLowerCase().includes('success') ? 'bg-green-500/5 border-green-200 text-green-700' : ''}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !newPin || newPin !== confirmPin || (pinSet && !currentPin)}
        >
          {loading ? 'Processing...' : pinSet ? 'Update PIN' : 'Save PIN'}
        </Button>
      </form>

      <div className="pt-6 border-t space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
          <p className="text-xs text-muted-foreground">Sensitive operations that affect application data.</p>
        </div>

        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Reset Application Settings</p>
            <p className="text-xs text-muted-foreground">Restore defaults. This will not delete your data.</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onResetSettings}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All
          </Button>
        </div>
      </div>
    </div>
  );
}
